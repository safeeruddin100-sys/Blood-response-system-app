"""
Tests for nearby donor radius filtering using Haversine formula.
Uses real Pakistani city coordinates for realistic distance checks.
"""

import pytest
from app.utils.geo import haversine_distance, filter_by_radius


class MockDonor:
    """Mock donor object with lat/lng attributes."""
    def __init__(self, name, latitude, longitude):
        self.name = name
        self.latitude = latitude
        self.longitude = longitude


class TestHaversine:
    """Test the Haversine distance calculation."""

    def test_same_point_zero_distance(self):
        """Distance between same point should be 0."""
        d = haversine_distance(24.8607, 67.0011, 24.8607, 67.0011)
        assert d == 0.0

    def test_karachi_to_lahore(self):
        """Karachi to Lahore should be ~1,010-1,030 km."""
        # Karachi (24.8607, 67.0011) → Lahore (31.5204, 74.3587)
        d = haversine_distance(24.8607, 67.0011, 31.5204, 74.3587)
        assert 1000 < d < 1100

    def test_karachi_to_islamabad(self):
        """Karachi to Islamabad should be ~1,130-1,170 km."""
        d = haversine_distance(24.8607, 67.0011, 33.6844, 73.0479)
        assert 1100 < d < 1200

    def test_nearby_points_in_karachi(self):
        """Two points in Karachi ~5km apart."""
        # Clifton area to Saddar
        d = haversine_distance(24.8138, 67.0300, 24.8607, 67.0011)
        assert 4 < d < 8

    def test_symmetry(self):
        """Distance A→B should equal distance B→A."""
        d1 = haversine_distance(24.8607, 67.0011, 31.5204, 74.3587)
        d2 = haversine_distance(31.5204, 74.3587, 24.8607, 67.0011)
        assert abs(d1 - d2) < 0.001


class TestFilterByRadius:
    """Test the radius filtering function."""

    def test_filters_within_radius(self):
        """Should return only donors within the given radius."""
        donors = [
            MockDonor("Nearby", 24.8650, 67.0050),   # ~0.6 km
            MockDonor("Medium", 24.8900, 67.0300),    # ~4.5 km
            MockDonor("Far Away", 31.5204, 74.3587),  # ~1000+ km (Lahore)
        ]
        center_lat, center_lng = 24.8607, 67.0011

        results = filter_by_radius(donors, center_lat, center_lng, radius_km=10)
        names = [d.name for d, _ in results]

        assert "Nearby" in names
        assert "Medium" in names
        assert "Far Away" not in names

    def test_sorted_by_distance(self):
        """Results should be sorted by distance (closest first)."""
        donors = [
            MockDonor("Far", 24.9200, 67.0800),
            MockDonor("Near", 24.8610, 67.0020),
            MockDonor("Mid", 24.8800, 67.0300),
        ]
        results = filter_by_radius(donors, 24.8607, 67.0011, radius_km=20)

        distances = [d for _, d in results]
        assert distances == sorted(distances)
        assert results[0][0].name == "Near"

    def test_empty_results_outside_radius(self):
        """Should return empty list if no donors within radius."""
        donors = [
            MockDonor("Lahore", 31.5204, 74.3587),
        ]
        results = filter_by_radius(donors, 24.8607, 67.0011, radius_km=5)
        assert len(results) == 0

    def test_handles_none_coordinates(self):
        """Donors with None lat/lng should be excluded."""
        donors = [
            MockDonor("No Location", None, None),
            MockDonor("Has Location", 24.8650, 67.0050),
        ]
        results = filter_by_radius(donors, 24.8607, 67.0011, radius_km=10)
        assert len(results) == 1
        assert results[0][0].name == "Has Location"

    def test_zero_radius(self):
        """Zero radius should only return exact matches (or nothing)."""
        donors = [MockDonor("Close", 24.8610, 67.0020)]
        results = filter_by_radius(donors, 24.8607, 67.0011, radius_km=0)
        assert len(results) == 0  # No one is exactly 0 km away

    def test_large_radius_returns_all(self):
        """Very large radius should include all donors with coordinates."""
        donors = [
            MockDonor("Karachi", 24.8607, 67.0011),
            MockDonor("Lahore", 31.5204, 74.3587),
            MockDonor("Islamabad", 33.6844, 73.0479),
        ]
        results = filter_by_radius(donors, 24.8607, 67.0011, radius_km=2000)
        assert len(results) == 3
