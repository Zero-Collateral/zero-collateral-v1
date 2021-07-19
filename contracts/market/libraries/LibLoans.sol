// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Libraries
import { LibEscrow } from "../../escrow/libraries/LibEscrow.sol";
import { NumbersLib } from "../../shared/libraries/NumbersLib.sol";
import {
    PlatformSettingsLib
} from "../../settings/platform/libraries/PlatformSettingsLib.sol";

// Storage
import { AppStorageLib } from "../../storage/app.sol";
import {
    MarketStorageLib,
    MarketStorage,
    Loan,
    LoanStatus,
    LoanDebt,
    LoanTerms
} from "../../storage/market.sol";

library LibLoans {
    using NumbersLib for int256;
    using NumbersLib for uint256;

    bytes32 internal constant ID = keccak256("LOANS");
    uint32 internal constant SECONDS_PER_YEAR = 31536000;

    function s() internal pure returns (MarketStorage storage) {
        return MarketStorageLib.store();
    }

    /**
     * @notice it returns the loan
     * @param loanID the ID of the respective loan
     * @return l_ the loan
     */
    function loan(uint256 loanID) internal view returns (Loan storage l_) {
        l_ = s().loans[loanID];
    }

    /**
     * @notice it returns the loan debt from a respective loan
     * @param loanID the ID of the respective loan
     * @return d_ the loan debt from a respective loan
     */
    function debt(uint256 loanID) internal view returns (LoanDebt storage d_) {
        d_ = s().loanDebt[loanID];
    }

    // DEPRECATED
    function terms(uint256 loanID)
        internal
        view
        returns (LoanTerms storage t_)
    {
        t_ = s()._loanTerms[loanID];
    }

    /**
     * @notice Returns the total amount owed for a specified loan.
     * @param loanID The loan ID to get the total amount owed.
     * @return owed_ uint256 The total owed amount.
     */
    function getTotalOwed(uint256 loanID)
        internal
        view
        returns (uint256 owed_)
    {
        if (loan(loanID).status == LoanStatus.Active) {
            owed_ = debt(loanID).principalOwed + (debt(loanID).interestOwed);
        }
    }

    /**
     * @notice Returns the amount of interest owed for a given loan and loan amount.
     * @param loanID The loan ID to get the owed interest.
     * @param amountBorrow The principal of the loan to take out.
     * @return uint256 The interest owed.
     */
    function getInterestOwedFor(uint256 loanID, uint256 amountBorrow)
        internal
        view
        returns (uint256)
    {
        return amountBorrow.percent(uint16(getInterestRatio(loanID)));
    }

    function getCollateralNeeded(uint256 loanID)
        internal
        returns (uint256 _needed)
    {
        (, _needed, ) = getCollateralNeededInfo(loanID);
    }

    /**
     * @notice it returns the total collateral needed in lending tokens, in collateral tokens and in escrowed loan values
     * @param loanID the loanID to get the total collateral needed
     * @return neededInLendingTokens total collateral needed in lending tokens
     * @return neededInCollateralTokens total collateral needed in collateral tokens
     * @return escrowLoanValue total collateral needed in loan value
     */
    function getCollateralNeededInfo(uint256 loanID)
        internal
        returns (
            uint256 neededInLendingTokens,
            uint256 neededInCollateralTokens,
            uint256 escrowLoanValue
        )
    {
        (neededInLendingTokens, escrowLoanValue) = getCollateralNeededInTokens(
            loanID
        );

        // check if needed lending tokens is zero. if true, then needed collateral tokens is zero. else,
        if (neededInLendingTokens == 0) {
            neededInCollateralTokens = 0;
        } else {
            neededInCollateralTokens = AppStorageLib.store()
                .priceAggregator
                .getValueFor(
                    loan(loanID).lendingToken,
                    loan(loanID).collateralToken,
                    neededInLendingTokens
                );
        }
    }

    /**
     * @notice Returns the minimum collateral value threshold, in the lending token, needed to take out the loan or for it be liquidated.
     * @dev If the loan status is TermsSet, then the value is whats needed to take out the loan.
     * @dev If the loan status is Active, then the value is the threshold at which the loan can be liquidated at.
     * @param loanID The loan ID to get needed collateral info for.
     * @return neededInLendingTokens int256 The minimum collateral value threshold required.
     * @return escrowLoanValue uint256 The value of the loan held in the escrow contract.
     */
    function getCollateralNeededInTokens(uint256 loanID)
        internal
        returns (uint256 neededInLendingTokens, uint256 escrowLoanValue)
    {
        if (loan(loanID).collateralRatio == 0) {
            return (0, 0);
        }

        /*
            The collateral to principal owed ratio is the sum of:
                * collateral buffer percent
                * loan interest rate
                * liquidation reward percent
                * X factor of additional collateral
        */
        // * To take out a loan (if status == TermsSet), the required collateral is (max loan amount * the collateral ratio).
        // * For the loan to not be liquidated (when status == Active), the minimum collateral is (principal owed * (X collateral factor + liquidation reward)).
        // * If the loan has an escrow account, the minimum collateral is ((principal owed - escrow value) * (X collateral factor + liquidation reward)).
        if (loan(loanID).status == LoanStatus.TermsSet) {
            neededInLendingTokens = loan(loanID).borrowedAmount.percent(
                loan(loanID).collateralRatio
            );
        } else if (loan(loanID).status == LoanStatus.Active) {
            uint16 requiredRatio = loan(loanID).collateralRatio -
                getInterestRatio(loanID) -
                uint16(PlatformSettingsLib.getCollateralBufferValue());

            neededInLendingTokens =
                debt(loanID).principalOwed +
                debt(loanID).interestOwed;
            escrowLoanValue = LibEscrow.calculateTotalValue(loanID);
            if (
                escrowLoanValue > 0 && neededInLendingTokens > escrowLoanValue
            ) {
                neededInLendingTokens -= escrowLoanValue;
            }
            neededInLendingTokens = neededInLendingTokens.percent(
                requiredRatio
            );
        }
    }

    /**
     * @notice check if a loan can go to end of auction with a collateral ratio
     * @return bool checking if collateralRatio is >= the over collateralized buffer value
     */
    function canGoToEOAWithCollateralRatio(uint256 collateralRatio)
        internal
        view
        returns (bool)
    {
        return
            collateralRatio >=
            PlatformSettingsLib.getOverCollateralizedBufferValue();
    }

    /**
     * @notice Returns the interest ratio based on the loan interest rate for the loan duration.
     * @notice There is a minimum threshold of 1%.
     * @dev The interest rate is APY (annual percentage yield).
     * @param loanID The loan ID to get the interest rate for.
     */
    function getInterestRatio(uint256 loanID)
        internal
        view
        returns (uint16 ratio_)
    {
        if (loan(loanID).interestRate > 0) {
            ratio_ = uint16(
                (uint64(loan(loanID).duration) * loan(loanID).interestRate) /
                    SECONDS_PER_YEAR
            );

            // If calculation for interest ratio chopped off decimals resulting in 0%, set minimum interest to 1%
            if (ratio_ == 0) {
                ratio_ = 1;
            }
        }
    }
}
