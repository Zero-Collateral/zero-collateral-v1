/*
    Copyright 2019 Fabrx Labs Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./Chainlink.sol";
import "./ZDai.sol";

/**
 * @title ZeroCollateralMain
 * @author Fabrx Labs Inc.
 *
 * Zero Collateral Main Contract
 *
 * Values of borrows are dictated in 2 decimals. All other values dictated in DAI (18 decimals).
 */

contract ZeroCollateralMain {
    using SafeMath for uint256;

    // ============ State Variables ============

    uint256 constant private DAI_DECIMALS = 10**18;

    // address of the DAI Contract
    IERC20 public daiContract;

    // address of the ZDAI token Contract
    // this contract should be given MinterRole
    ZDai public zDaiContract;

    // address of the Zero Collateral DAO Wallet
    // part of interest paid automatically goes back to DAO (5-10% ish)
    address public zcDaoContract;

    // Oracle for ETH/USD rate
    Chainlink public oracle;

    // borrow count
    uint256 public borrowCount;

    // total accrued interest
    uint256 public totalAccruedInterest;

    // last block number of accrued interest
    uint256 public blockAccruedInterest;

    // amount of DAI remaining as unredeemed interest
    uint256 public unredeemedDAIInterest;

    // amount of DAI remaining as unredeemed interest
    uint256 public defaultPool;

    // amount collateral locked in contract
    uint256 public collateralLocked;

    // interest accrued from lending account
    struct LendAccount {
        uint256 lastBlockAccrued;
        uint256 totalAccruedInterest;
    }

    // borrower account details
    struct BorrowAccount {
        uint256 lastBorrowId;
        uint256 amountPaidRedemptionPool;
        uint256 amountPaidDefaultPool;
        uint256 collateral;
    }

    // data per borrow as struct
    struct Borrow {
        uint256 amountBorrow;
        uint256 amountOwed;
        uint256 amountOwedInitial;
        bool active;
        uint256 blockStart;
        uint256 blockEnd;
        address account;
        bool liquidated;
        uint256 id;
    }

    // array of all lending accounts
    mapping (address => LendAccount) public lenderAccounts;

    // array of all borrower accounts
    mapping (address => BorrowAccount) public borrowerAccounts;

    // mapping of borrowID to borrow
    mapping (uint256 => Borrow) public borrows;

    // publically accessible array of all borrows
    Borrow[] public borrowStucts;

    // event on redemption of interest
    event Redeemed(address indexed lenderAccount, uint256 amount);

    // collateral deposited by borrower
    event CollateralDeposited(address indexed borrower, uint256 amount);

    // collateral withdrawn by borrower
    event CollateralWithdrawn(address indexed borrower, uint256 amount);

    // borrow event initiated
    event BorrowInitiated(address indexed borrower, Borrow borrow);

    // ============ Constructor ============

    constructor(
        address daiAddress,
        address zDaiAddress,
        address daoAddress
    )
    public
    {
        zDaiContract = ZDai(zDaiAddress);
        daiContract = IERC20(daiAddress);
        zcDaoContract = daoAddress;

        borrowCount = 0;
        totalAccruedInterest = 0;
        blockAccruedInterest = block.number;
        unredeemedDAIInterest = 0;
        defaultPool = 0;
        collateralLocked = 0;
    }

    // ============ Public Functions ============

    // lend DAI, mint ZDAI in return
    // lender depositing DAI and gets given ZDAI
    function lendDAI(
        uint256 amount
    )
        public
        returns (uint256)
    {
        require(daiContract.transferFrom(msg.sender, address(this), amount), "DAI_DEPOSIT_FAILED");

        updateTotalAccruedInterest();
        updateAccountAccruedInterest();

        zDaiContract.mint(msg.sender, amount);

        return amount;
    }

    // burn ZDAI, receive DAI
    // lender gives back their ZDAI and receives their original DAI back
    // currently interest is pulled out separately -> redeemInterestFromPool
    function retrieveDAI(
        uint256 amount
    )
        public
        returns (uint256)
    {
        // cannot withdraw collateral
        uint256 amountAvailableForWithdraw = daiContract.balanceOf(address(this));
        amountAvailableForWithdraw = amountAvailableForWithdraw.sub(collateralLocked.sub(defaultPool.sub(unredeemedDAIInterest)));

        // only allow withdraw up to available
        uint256 finalAmount = amount;
        if (amount > amountAvailableForWithdraw) {
            finalAmount = amountAvailableForWithdraw;
        }

        updateTotalAccruedInterest();
        updateAccountAccruedInterest();

        zDaiContract.burn(msg.sender, finalAmount);

        require(daiContract.transfer(msg.sender, finalAmount));

        return finalAmount;
    }

    // call update accrued interest of sender account
    // maybe go?
    function callUpdateAccountAccruedInterest() public returns(uint256 totalAccruedInterest) {
        updateTotalAccruedInterest();
        totalAccruedInterest = updateAccountAccruedInterest();
        return totalAccruedInterest;
    }

    // redeem interest from redemption pool
    function redeemInterestFromPool() public returns (uint256) {
        // update redeemable interest
        updateTotalAccruedInterest();
        updateAccountAccruedInterest();

         // calculated interestRedeemable as amount of DAI in decimals
        uint256 interestRedeemable = lenderAccounts[msg.sender].totalAccruedInterest.mul(unredeemedDAIInterest).div(totalAccruedInterest);

        // update totalAccruedInterest
        totalAccruedInterest = totalAccruedInterest.sub(lenderAccounts[msg.sender].totalAccruedInterest);

        // set accrued interest of lender to 0
        lenderAccounts[msg.sender].totalAccruedInterest = 0;

        // update unredeemedDAIInterest
        unredeemedDAIInterest = unredeemedDAIInterest.sub(interestRedeemable);

        // transfer DAI to lender
        require(daiContract.transfer(msg.sender, interestRedeemable));

        // emit event of redemption
        emit Redeemed(msg.sender, interestRedeemable);

        return interestRedeemable;
    }

    // borrower deposit collateral
    // change to ETH - deposit ETH and keep track of how much ETH they have
    // if the current price changes and they're undercollateralised -> problem
    function depositCollateralBorrower() public payable {
        // Not needed to check msg.valu > 0. It doesn't increase collateral locked.
        uint256 amount = msg.value;

        collateralLocked = collateralLocked.add(amount);

        // updated account collateral
        borrowerAccounts[msg.sender].collateral = borrowerAccounts[msg.sender].collateral.add(amount);
        emit CollateralDeposited(msg.sender, amount);
    }

    // NEW FUNCTION - get current state of collateral/loan - is it undercollateralised by x%?

    // borrower withdraw collateral
    // liquidate -> anything undercollateralised or expired gets liquidated
    // then checks there's a outstanding borrow live
    // can withdraw collateral down to a certain percentage if there's still outstanding borrow
    function withdrawCollateralBorrower(uint256 amount) public {

        // liquidate any outstanding unpaid borrows
        liquidate(msg.sender);

        // check for no outstanding borrow
        uint256 borrowerLastBorrowId = borrowerAccounts[msg.sender].lastBorrowId;
        if (borrowerLastBorrowId != 0) {
            require(!borrows[borrowerLastBorrowId].active, "ZeroCollateral::withdrawCollateralBorrower - OUTSTANDING_BORROW");
        }

        if (borrowerAccounts[msg.sender].collateral > amount) {
            borrowerAccounts[msg.sender].collateral = borrowerAccounts[msg.sender].collateral.sub(amount);
            collateralLocked = collateralLocked.sub(amount);
            require(daiContract.transfer(msg.sender, amount));

            emit CollateralWithdrawn(msg.sender, amount);
        } else {
            uint256 transferAmount = borrowerAccounts[msg.sender].collateral;
            borrowerAccounts[msg.sender].collateral = 0;
            collateralLocked = collateralLocked.sub(transferAmount);
            require(daiContract.transfer(msg.sender, transferAmount));

            emit CollateralWithdrawn(msg.sender, borrowerAccounts[msg.sender].collateral);
        }

    }

    // liquidate unpaid borrows
    // now to encorporate the actual price of ETH - is the loan undercollateralised or expired
    // currently it just checks if it is expired
    // remove nonredeemable collateral
    function liquidate(address borrower) public{

        uint256 borrowerLastBorrowId = borrowerAccounts[borrower].lastBorrowId;

        if (borrows[borrowerLastBorrowId].active && block.timestamp > borrows[borrowerLastBorrowId].blockEnd) {
            // set old amount paid to defaultPool
            uint256 oldAmountPaidDefaultPool = borrowerAccounts[borrower].amountPaidDefaultPool;

            // liquidate account
            borrowerAccounts[borrower].amountPaidRedemptionPool = 0;
            borrowerAccounts[borrower].amountPaidDefaultPool = 0;

            // amount owed from loan
            uint256 amountOwedDAI = borrows[borrowerLastBorrowId].amountOwed.mul(DAI_DECIMALS).div(100);

            if (amountOwedDAI > oldAmountPaidDefaultPool) {
                uint256 liquidatedCollateral = amountOwedDAI.sub(oldAmountPaidDefaultPool);

                // primary liquidation: non-redeemable collateral
                if (liquidatedCollateral > borrowerAccounts[borrower].collateral) {
                    // update collateralNonRedeemable
                    uint256 oldCollateral = borrowerAccounts[borrower].collateral;

                    borrowerAccounts[borrower].collateral = 0;
                    liquidatedCollateral = liquidatedCollateral.sub(oldCollateral);

                    // update default pool (where non-redeemable collateral resides)
                    defaultPool = defaultPool.sub(oldCollateral);
                    unredeemedDAIInterest = unredeemedDAIInterest.add(oldCollateral);

                } else {
                    // update collateralNonRedeemable
                    borrowerAccounts[borrower].collateral = borrowerAccounts[borrower].collateral.sub(liquidatedCollateral);

                    // update default pool (where non-redeemable collateral resides)
                    defaultPool = defaultPool.sub(liquidatedCollateral);
                    unredeemedDAIInterest = unredeemedDAIInterest.add(liquidatedCollateral);

                    // set liquidatedCollateral to 0
                    liquidatedCollateral = 0;

                }

                // secondary liquidation: redeemable collateral
                if (liquidatedCollateral > borrowerAccounts[borrower].collateral) {
                    // update collateralRedeemable
                    uint256 oldCollateral = borrowerAccounts[borrower].collateral;
                    borrowerAccounts[borrower].collateral = 0;
                    liquidatedCollateral = liquidatedCollateral.sub(oldCollateral);

                    // update collateral locked
                    collateralLocked = collateralLocked.sub(oldCollateral);
                    unredeemedDAIInterest = unredeemedDAIInterest.add(oldCollateral);
                } else {
                    // update collateralRedeemable
                    borrowerAccounts[borrower].collateral = borrowerAccounts[borrower].collateral.sub(liquidatedCollateral);

                    // update collateral locked
                    collateralLocked = collateralLocked.sub(liquidatedCollateral);
                    unredeemedDAIInterest = unredeemedDAIInterest.add(liquidatedCollateral);

                    // set liquidatedCollateral to 0
                    liquidatedCollateral = 0;
                }

            }

            borrows[borrowerLastBorrowId].liquidated = true;
            borrows[borrowerLastBorrowId].active = false;
        }
    }

    function getCollateralNeeded(uint256 amountBorrow) view public returns(uint256){
        uint256 poolContributions = (borrowerAccounts[msg.sender].amountPaidRedemptionPool);
        uint256 amountBorrowDecimals = amountBorrow.mul(10**6); // convert to DAI decimals
        
        if (poolContributions >= amountBorrowDecimals){
            return 0;
        }else{
            return ( amountBorrowDecimals - poolContributions ); // return DAI units of collateral
        }
    }

    // calculates whether they have enough collateral to withdraw amount of DAI
    /*
    function createBorrow(uint256 amountBorrow, uint256 numberDays) public returns (bool) {
        // max term 365 days
        require(numberDays <= 365, "Number Days: MORE THAN 365");

        // cannot withdraw collateral
        uint256 amountAvailableForWithdraw = daiContract.balanceOf(address(this)).sub(collateralLocked).sub(defaultPool).sub(unredeemedDAIInterest).div(DAI_DECIMALS);
        uint256 finalAmount = amountBorrow;
        // only allow withdraw up to available
        if (finalAmount > amountAvailableForWithdraw) {
            finalAmount = amountAvailableForWithdraw;
        }

        // check if any outstanding borrows
        uint256 borrowerLastBorrowId = borrowerAccounts[msg.sender].lastBorrowId;

        if (borrowerLastBorrowId != 0) {
            if (borrows[borrowerLastBorrowId].active) {
                return false;
            }
        }

        // check if collateralDeposited > getCollateralNeeded
        if (getCollateralNeeded(finalAmount) > getTotalCollateral(msg.sender)) {
            return false;
        }

        // increment borrow count
        borrowCount += 1;

        // create borrow
        Borrow storage borrow = borrows[borrowCount];

        uint256 borrowInterestRate = calculateInterestDiscount(finalAmount, numberDays);

        borrow.amountBorrow = finalAmount;
        // divided by 18 plus 2 decimals to remove interest rate decimals
        borrow.amountOwed = finalAmount.add(finalAmount.mul(borrowInterestRate).div(10**20));
        borrow.amountOwedInitial = borrow.amountOwed;
        borrow.active = true;
        borrow.blockStart = block.timestamp;
        borrow.blockEnd = block.timestamp.add(numberDays.mul(60*60*24));
        borrow.account = msg.sender;
        borrow.liquidated = false;
        borrow.id = borrowCount;

        if (borrow.amountBorrow == borrow.amountOwedInitial) {
            borrow.amountOwed = finalAmount.add(1);
            borrow.amountOwedInitial = finalAmount.add(1);
        }

        borrowStucts.push(borrow);
        borrowerAccounts[msg.sender].lastBorrowId = borrowCount;

        require(daiContract.transfer(msg.sender, finalAmount.mul(DAI_DECIMALS).div(100)));

        emit BorrowInitiated(msg.sender, borrow);

        return true;
    }

    function calculateInterestDiscount(uint256 amountBorrow, uint256 numberDays) view public returns (uint256) {
        // amountBorrow > 0 
        require(amountBorrow > 0, "Amount Borrow: LESS THAN 0");
        
        // calculate % of interest paid (8 decimals) + collateral (8 decimals), divided by borrow amount (2 decimals). Resulting 6 decimals.
        uint256 x = borrowerAccounts[msg.sender].amountPaidRedemptionPool.add(borrowerAccounts[msg.sender].collateral).div(amountBorrow);
        
        if (x > (10**6)){
            x = (10**6);
        }
        
        // interest rate discount calculated
        uint256 interest_rate = calculateInterestWithDays(numberDays); // 8 decimals
        uint256 interest_rate_discount = interest_rate - (((interest_rate * x)/3)  / (10**6)); // 8 decimals
         
         return interest_rate_discount;
    }
    */

    function getTotalCollateral(address borrower) public view returns (uint256) {
        return borrowerAccounts[borrower].collateral;
    }

    function calculateInterestWithDays(uint256 numberDays) view public returns (uint256) {
        
        // min term 1 days
        require(1 <= numberDays, "Number Days: LESS THAN 0");
        
        // max term 365 days
        require(numberDays <= 365, "Number Days: MORE THAN 365");
        
        uint256 interest_rate = 12 * (10**8);
        
        if (numberDays <= 7){
            interest_rate = (0*(10**8)) + (( (1*(10**8)) * (numberDays - 0)) / 7 );
        }else if (7 < numberDays && numberDays <= 14){
            interest_rate = (1*(10**8)) + (( (5*(10**7)) * (numberDays - 7)) / 7 );
        }else if (14 < numberDays && numberDays <= 30){
            interest_rate = (15*(10**7)) + (( (1*(10**8)) * (numberDays - 14)) / 14 );
        }else if (30 < numberDays && numberDays <= 60){
            interest_rate = (25*(10**7)) + (( (15*(10**7)) * (numberDays - 30)) / 30 );
        }else if (60 < numberDays && numberDays <= 120){
            interest_rate = (4*(10**8)) + (( (2*(10**8)) * (numberDays - 60)) / 60 );
        }else if (120 < numberDays && numberDays <= 180){
            interest_rate = (6*(10**8)) + (( (2*(10**8)) * (numberDays - 120)) / 60 );
        }else if (180 < numberDays && numberDays <= 365){
            interest_rate = (8*(10**8)) + (( (4*(10**8)) * (numberDays - 180)) / 185 );
        }
         
         return interest_rate;
    }

    // paying back an amount of DAI - doesn't have to be all of it
    // updates the borrow itself
    function repayBorrow(uint256 amountRepay) public returns(uint256) {
        uint256 repayOverAmount;

        uint256 borrowerLastBorrowId = borrowerAccounts[msg.sender].lastBorrowId;

        if (borrows[borrowerLastBorrowId].active) {

            // set initial redemption pool additional value to zero
            uint256 unredeemedDAIInterestAddition = 0;
            uint256 defaultPoolAddition = 0;

            // calculate general borrow interest
            uint256 interest = borrows[borrowerLastBorrowId].amountOwedInitial.sub(borrows[borrowerLastBorrowId].amountBorrow);

            if (amountRepay > borrows[borrowerLastBorrowId].amountOwed) {
                repayOverAmount = repayOverAmount.add(amountRepay.sub(borrows[borrowerLastBorrowId].amountOwed));

                // transfer DAI to this address from borrow address
                require(daiContract.transferFrom(msg.sender, address(this), borrows[borrowerLastBorrowId].amountOwed.mul(DAI_DECIMALS).div(100)));

                // update unredeemedDAIInterestAddition based on previous paybacks
                if (interest > borrows[borrowerLastBorrowId].amountOwed) {
                    unredeemedDAIInterestAddition = borrows[borrowerLastBorrowId].amountOwed.div(2);
                    defaultPoolAddition = borrows[borrowerLastBorrowId].amountOwed.div(2);
                } else {
                    unredeemedDAIInterestAddition = interest.div(2);
                    defaultPoolAddition = interest.div(2);
                }

                // split redepmtion pool and dao funding amounts
                uint256 daoFundingAmount = unredeemedDAIInterestAddition.mul(DAI_DECIMALS).div(100).mul(2).div(10);
                uint256 unredeemedDAIInterestAmount = unredeemedDAIInterestAddition.mul(DAI_DECIMALS).div(100).mul(8).div(10);

                // updated amount of DAI in unredeemedDAIInterest & defaultPool
                unredeemedDAIInterest = unredeemedDAIInterest.add(unredeemedDAIInterestAmount); // 10^18 decimals for DAI
                defaultPool = defaultPool.add(defaultPoolAddition.mul(DAI_DECIMALS).div(100)); // 10^18 decimals for DAI

                borrowerAccounts[msg.sender].amountPaidRedemptionPool = borrowerAccounts[msg.sender].amountPaidRedemptionPool.add(unredeemedDAIInterestAmount);
                borrowerAccounts[msg.sender].amountPaidDefaultPool = borrowerAccounts[msg.sender].amountPaidDefaultPool.add(defaultPoolAddition.mul(DAI_DECIMALS).div(100));

                borrows[borrowerLastBorrowId].amountOwed = 0;

                // transfer DAI to ZC DAO wallet from this address
                require(daiContract.transfer(zcDaoContract, daoFundingAmount));

            } else {
                // transfer DAI to this address from borrow address
                require(daiContract.transferFrom(msg.sender, address(this), amountRepay.mul(DAI_DECIMALS).div(100)));

                // update unredeemedDAIInterestAddition based on previous paybacks
                uint256 remainingOwed = borrows[borrowerLastBorrowId].amountOwed.sub(amountRepay);
                if (interest > borrows[borrowerLastBorrowId].amountOwed) {
                    unredeemedDAIInterestAddition = amountRepay.div(2);
                    defaultPoolAddition = unredeemedDAIInterestAddition;
                } else if (interest > remainingOwed) {
                    unredeemedDAIInterestAddition = interest.sub(remainingOwed).div(2);
                    defaultPoolAddition = unredeemedDAIInterestAddition;
                }

                // split redepmtion pool and dao funding amounts
                uint256 daoFundingAmount = unredeemedDAIInterestAddition.div(100).mul(2).div(10);
                uint256 unredeemedDAIInterestAmount = unredeemedDAIInterestAddition.mul(DAI_DECIMALS).div(100).mul(8).div(10);

                // updated amount of DAI in unredeemedDAIInterest
                unredeemedDAIInterest = unredeemedDAIInterest.add(unredeemedDAIInterestAmount); // 10^18 decimals for DAI
                defaultPool = defaultPool.add(defaultPoolAddition.mul(DAI_DECIMALS).div(100)); // 10^18 decimals for DAI

                borrowerAccounts[msg.sender].amountPaidRedemptionPool = borrowerAccounts[msg.sender].amountPaidRedemptionPool.add(unredeemedDAIInterestAmount);
                borrowerAccounts[msg.sender].amountPaidDefaultPool = borrowerAccounts[msg.sender].amountPaidDefaultPool.add(defaultPoolAddition.mul(DAI_DECIMALS).div(100));

                borrows[borrowerLastBorrowId].amountOwed = borrows[borrowerLastBorrowId].amountOwed.sub(amountRepay);

                // transfer DAI to ZC DAO wallet from this address
                require(daiContract.transfer(zcDaoContract, daoFundingAmount));
            }
            if (borrows[borrowerLastBorrowId].amountOwed == 0) {
                borrows[borrowerLastBorrowId].active = false;
            }
        }

        // Resend funds to borrower
        return repayOverAmount;
    }

    // ============ Private Functions ============

    // updates the accrued interest for the lenders
    function updateTotalAccruedInterest()
        private
        returns (uint256)
    {
        uint256 totalSupply = zDaiContract.totalSupply();
        uint256 previousBlockAccruedInterest = blockAccruedInterest;
        blockAccruedInterest = block.number;
        totalAccruedInterest = totalAccruedInterest.add(blockAccruedInterest.sub(previousBlockAccruedInterest).mul(totalSupply));
        return totalAccruedInterest;
    }

    function updateAccountAccruedInterest()
        private
        returns (uint256)
    {
        uint256 previousBlockAccruedInterest = lenderAccounts[msg.sender].lastBlockAccrued;
        uint256 balance = zDaiContract.balanceOf(msg.sender);

        lenderAccounts[msg.sender].lastBlockAccrued = block.number;
        lenderAccounts[msg.sender].totalAccruedInterest = lenderAccounts[msg.sender].totalAccruedInterest.add(block.number.sub(previousBlockAccruedInterest).mul(balance));

        return lenderAccounts[msg.sender].totalAccruedInterest;
    }
}