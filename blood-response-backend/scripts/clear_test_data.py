"""Delete test data from the selected MongoDB collections."""

import os
import sys

from pymongo import MongoClient

# Support the documented direct invocation: python scripts/clear_test_data.py
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings


COLLECTIONS = (
    "users",
    "donor_profiles",
    "blood_requests",
    "donation_matches",
    "notifications",
    "reports",
)


def main() -> None:
    client = MongoClient(settings.MONGO_URI)
    try:
        database = client[settings.DB_NAME]
        for collection_name in COLLECTIONS:
            result = database[collection_name].delete_many({})
            remaining = database[collection_name].count_documents({})
            print(
                f"{collection_name}: deleted {result.deleted_count}; "
                f"remaining {remaining}"
            )
    finally:
        client.close()


if __name__ == "__main__":
    main()