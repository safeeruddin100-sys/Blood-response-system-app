"""
Blood group compatibility matrix for red blood cell transfusion.

Given a RECIPIENT's blood group, returns which DONOR blood groups are compatible.
This follows the standard ABO + Rh compatibility rules:
  - O- is the universal donor (can donate to anyone)
  - AB+ is the universal recipient (can receive from anyone)
  - Rh- can donate to both Rh- and Rh+ of compatible ABO types
  - Rh+ can only donate to Rh+ of compatible ABO types
"""

from typing import List

# Key = recipient blood group, Value = list of compatible donor blood groups
BLOOD_COMPATIBILITY: dict[str, list[str]] = {
    "O-":  ["O-"],
    "O+":  ["O-", "O+"],
    "A-":  ["O-", "A-"],
    "A+":  ["O-", "O+", "A-", "A+"],
    "B-":  ["O-", "B-"],
    "B+":  ["O-", "O+", "B-", "B+"],
    "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
}

# All valid blood groups
VALID_BLOOD_GROUPS = list(BLOOD_COMPATIBILITY.keys())


def get_compatible_donor_groups(recipient_blood_group: str) -> List[str]:
    """
    Given a recipient's blood group, return all blood groups that can safely
    donate to them (red blood cell transfusion compatibility).

    Args:
        recipient_blood_group: The blood group of the patient/recipient.

    Returns:
        List of compatible donor blood group strings.

    Raises:
        ValueError: If the blood group is not recognized.
    """
    bg = recipient_blood_group.strip().upper()
    # Normalize: accept both "A+" and "A POS" / "A POSITIVE" etc.
    if bg not in BLOOD_COMPATIBILITY:
        raise ValueError(
            f"Unknown blood group: '{recipient_blood_group}'. "
            f"Valid groups: {VALID_BLOOD_GROUPS}"
        )
    return BLOOD_COMPATIBILITY[bg]


def can_donate_to(donor_blood_group: str, recipient_blood_group: str) -> bool:
    """Check if a specific donor blood group can donate to a recipient."""
    compatible = get_compatible_donor_groups(recipient_blood_group)
    return donor_blood_group.strip().upper() in compatible
