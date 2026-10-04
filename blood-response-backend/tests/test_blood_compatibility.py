"""
Tests for blood group compatibility matrix.
Verifies the complete 8×8 compatibility chart for red blood cell transfusion.
"""

import pytest
from app.utils.blood_compatibility import (
    get_compatible_donor_groups,
    can_donate_to,
    BLOOD_COMPATIBILITY,
    VALID_BLOOD_GROUPS,
)


class TestBloodCompatibility:
    """Test the blood group compatibility matrix."""

    def test_all_eight_groups_defined(self):
        """All 8 blood groups should be in the matrix."""
        expected = {"O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"}
        assert set(VALID_BLOOD_GROUPS) == expected

    def test_o_negative_universal_donor(self):
        """O- should be compatible with ALL blood groups (universal donor)."""
        for recipient in VALID_BLOOD_GROUPS:
            compatible = get_compatible_donor_groups(recipient)
            assert "O-" in compatible, f"O- should donate to {recipient}"

    def test_ab_positive_universal_recipient(self):
        """AB+ should accept ALL blood groups (universal recipient)."""
        compatible = get_compatible_donor_groups("AB+")
        assert set(compatible) == set(VALID_BLOOD_GROUPS)

    def test_o_negative_recipients(self):
        """O- recipients can only receive from O-."""
        assert get_compatible_donor_groups("O-") == ["O-"]

    def test_o_positive_recipients(self):
        """O+ recipients can receive from O- and O+."""
        assert set(get_compatible_donor_groups("O+")) == {"O-", "O+"}

    def test_a_negative_recipients(self):
        """A- recipients can receive from O- and A-."""
        assert set(get_compatible_donor_groups("A-")) == {"O-", "A-"}

    def test_a_positive_recipients(self):
        """A+ recipients can receive from O-, O+, A-, A+."""
        assert set(get_compatible_donor_groups("A+")) == {"O-", "O+", "A-", "A+"}

    def test_b_negative_recipients(self):
        """B- recipients can receive from O- and B-."""
        assert set(get_compatible_donor_groups("B-")) == {"O-", "B-"}

    def test_b_positive_recipients(self):
        """B+ recipients can receive from O-, O+, B-, B+."""
        assert set(get_compatible_donor_groups("B+")) == {"O-", "O+", "B-", "B+"}

    def test_ab_negative_recipients(self):
        """AB- recipients can receive from O-, A-, B-, AB-."""
        assert set(get_compatible_donor_groups("AB-")) == {"O-", "A-", "B-", "AB-"}

    def test_invalid_blood_group_raises(self):
        """Invalid blood group should raise ValueError."""
        with pytest.raises(ValueError, match="Unknown blood group"):
            get_compatible_donor_groups("X+")

    def test_case_insensitive(self):
        """Blood group lookup should be case-insensitive."""
        assert get_compatible_donor_groups("a+") == get_compatible_donor_groups("A+")
        assert get_compatible_donor_groups("ab-") == get_compatible_donor_groups("AB-")

    def test_can_donate_to_positive(self):
        """can_donate_to should return True for valid pairs."""
        assert can_donate_to("O-", "A+") is True
        assert can_donate_to("A+", "A+") is True
        assert can_donate_to("O-", "AB+") is True

    def test_can_donate_to_negative(self):
        """can_donate_to should return False for invalid pairs."""
        assert can_donate_to("A+", "B+") is False
        assert can_donate_to("B+", "A-") is False
        assert can_donate_to("AB+", "O-") is False

    def test_no_self_donation_gaps(self):
        """Every blood group should be compatible with itself."""
        for bg in VALID_BLOOD_GROUPS:
            assert can_donate_to(bg, bg), f"{bg} should be self-compatible"
