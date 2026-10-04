"""
Geographic utilities — Haversine distance calculation for nearby donor matching.

No PostGIS dependency needed — pure Python math for MVP.
For production scale with millions of donors, consider PostGIS or a spatial index.
"""

import math
from typing import List, Tuple

# Earth's radius in kilometers
EARTH_RADIUS_KM = 6371.0


def haversine_distance(
    lat1: float, lon1: float,
    lat2: float, lon2: float,
) -> float:
    """
    Calculate the great-circle distance between two points on Earth
    using the Haversine formula.

    Args:
        lat1, lon1: Latitude/longitude of point 1 (degrees)
        lat2, lon2: Latitude/longitude of point 2 (degrees)

    Returns:
        Distance in kilometers.
    """
    # Convert to radians
    lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
    lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)

    dlat = lat2_r - lat1_r
    dlon = lon2_r - lon1_r

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return EARTH_RADIUS_KM * c


def filter_by_radius(
    items: list,
    center_lat: float,
    center_lng: float,
    radius_km: float,
    lat_attr: str = "latitude",
    lng_attr: str = "longitude",
) -> List[Tuple]:
    """
    Filter a list of objects by distance from a center point.

    Args:
        items: List of objects with lat/lng attributes.
        center_lat, center_lng: Center point coordinates.
        radius_km: Maximum distance in km.
        lat_attr, lng_attr: Attribute names for latitude/longitude on items.

    Returns:
        List of (item, distance_km) tuples, sorted by distance ascending.
    """
    results = []
    for item in items:
        item_lat = getattr(item, lat_attr, None)
        item_lng = getattr(item, lng_attr, None)
        if item_lat is None or item_lng is None:
            continue

        distance = haversine_distance(center_lat, center_lng, item_lat, item_lng)
        if distance <= radius_km:
            results.append((item, round(distance, 2)))

    # Sort by distance (closest first)
    results.sort(key=lambda x: x[1])
    return results
