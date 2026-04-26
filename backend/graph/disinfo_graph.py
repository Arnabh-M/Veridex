# Propagation graph uses seeded simulation for demo purposes. In production, replace build_disinfo_graph with live social media API ingestion.

from __future__ import annotations

import datetime
import hashlib
import random
from typing import Any, Dict, List

import networkx as nx


REGION_COUNTRIES = {
    "East Asia (likely China)": ["China", "China", "China", "Hong Kong", "Taiwan"],
    "East Asia (China/Philippines/Singapore)": ["China", "China", "Philippines", "Singapore", "Malaysia"],
    "East Asia (Japan/Korea)": ["Japan", "Japan", "South Korea", "South Korea", "Taiwan"],
    "Eastern Europe (likely Russia)": ["Russia", "Russia", "Russia", "Belarus", "Ukraine"],
    "Eastern Europe / Middle East (Russia/Turkey)": ["Russia", "Russia", "Turkey", "Iran", "Belarus"],
    "Middle East / North Africa": ["Iran", "Saudi Arabia", "UAE", "Egypt", "Turkey"],
    "Middle East (likely Iran)": ["Iran", "Iran", "Iraq", "Syria", "Lebanon"],
    "South Asia (likely India)": ["India", "India", "India", "Bangladesh", "Sri Lanka"],
    "South Asia (likely Pakistan)": ["Pakistan", "Pakistan", "Afghanistan", "Bangladesh", "India"],
    "South Asia (Pakistan/Kazakhstan)": ["Pakistan", "Pakistan", "Kazakhstan", "Afghanistan", "Uzbekistan"],
    "Southeast Asia": ["Vietnam", "Thailand", "Indonesia", "Malaysia", "Philippines"],
    "Southeast Asia (likely Thailand)": ["Thailand", "Thailand", "Myanmar", "Cambodia", "Laos"],
    "Western Europe": ["Germany", "France", "Netherlands", "Belgium", "Austria"],
    "Western Europe (likely France)": ["France", "France", "Belgium", "Switzerland", "Algeria"],
    "Latin America / Spain": ["Brazil", "Mexico", "Argentina", "Colombia", "Spain"],
    "English-speaking region (US/UK/AU)": ["United States", "United States", "United Kingdom", "Canada", "Australia"],
    "Eastern USA / Colombia": ["United States", "United States", "Canada", "Colombia", "Mexico"],
    "Western USA": ["United States", "United States", "Canada", "Mexico", "United Kingdom"],
    "South America (Brazil/Argentina)": ["Brazil", "Brazil", "Argentina", "Chile", "Colombia"],
    "UK / West Africa": ["United Kingdom", "Nigeria", "Ghana", "Senegal", "United Kingdom"],
    "Western Europe / West Africa": ["France", "Nigeria", "Germany", "Cameroon", "Netherlands"],
    "Eastern Europe / Eastern Africa": ["Russia", "Ethiopia", "Ukraine", "Kenya", "Belarus"],
    "Central Asia / Turkey": ["Turkey", "Turkey", "Kazakhstan", "Uzbekistan", "Azerbaijan"],
    "Unknown": ["Unknown", "Unknown", "Unknown", "Unknown", "Unknown"],
}

REGION_COLOR_MAP = {
    "East Asia": "#ff6b6b",
    "Eastern Europe": "#ff9f43",
    "Middle East": "#ffd32a",
    "South Asia": "#0be881",
    "Southeast Asia": "#00d8d6",
    "Western Europe": "#4d9fff",
    "Latin America": "#b388ff",
    "English-speaking": "#ff6b9d",
    "South America": "#b388ff",
    "Unknown": "#7a8499",
}


def _rand_handle() -> str:
    adjectives = [
        "daily",
        "truth",
        "viral",
        "real",
        "pulse",
        "world",
        "local",
        "news",
        "alert",
        "echo",
        "trend",
        "signal",
    ]
    nouns = [
        "report",
        "watch",
        "wire",
        "update",
        "desk",
        "feed",
        "chronicle",
        "insight",
        "ledger",
        "digest",
        "scope",
        "brief",
    ]
    return f"{random.choice(adjectives)}_{random.choice(nouns)}{random.randint(1, 9999)}"


def _get_region_color(country: str, region_countries: dict) -> str:
    """Map a country back to its region color."""
    for region, countries in region_countries.items():
        if country in countries:
            for key in REGION_COLOR_MAP:
                if key.lower() in region.lower():
                    return REGION_COLOR_MAP[key]
    return REGION_COLOR_MAP["Unknown"]


def _pick_country(region: str, index: int, rng) -> str:
    """Pick a country from the region list using seeded random."""
    countries = REGION_COUNTRIES.get(region, REGION_COUNTRIES["Unknown"])
    return rng.choice(countries)


def build_disinfo_graph(
    media_hash: str,
    confidence: float,
    flags: List[str],
    country_hint: str = "unknown",
    origin_region: str = "Unknown",
) -> Dict[str, Any]:
    """
    Build a simulated disinformation propagation graph for demo/UX purposes.

    The simulation is seeded from `media_hash` so the resulting graph is deterministic
    for the same inputs.

    Args:
        media_hash: Stable identifier of the analyzed media (e.g., SHA256).
        confidence: Likelihood percentage the content is synthetic (0-100).
        flags: Detection flags that influence amplification intensity.
        country_hint: Origin country label to attach to the origin node.

    Returns:
        A dict with nodes, edges, stats, and a human-readable graph_summary.
    """

    # 1. Deterministic seed from media_hash
    seed = int(hashlib.md5(media_hash.encode()).hexdigest()[:8], 16)
    random.seed(seed)

    # 2. Create directed graph
    G = nx.DiGraph()

    # Optional base time (not returned; kept for realism/debug)
    _base_time = datetime.datetime.utcnow()
    _ = _base_time  # keep import usage explicit without exposing it

    # 3. Origin node
    origin_id = "origin_0"
    origin_countries = REGION_COUNTRIES.get(origin_region, REGION_COUNTRIES["Unknown"])
    origin_country = origin_countries[0]  # take the most likely country
    if country_hint and country_hint != "unknown":
        origin_country = country_hint  # explicit hint overrides region
    region_color = _get_region_color(origin_country, REGION_COUNTRIES)
    origin = {
        "id": origin_id,
        "label": f"@{_rand_handle()}",
        "bot_score": round(random.uniform(0.6, 0.95), 2),
        "country": origin_country,
        "region_color": region_color,
        "account_age_days": random.randint(3, 180),
        "follower_count": random.randint(50, 500),
        "type": "origin",
    }

    # 4. Add origin
    G.add_node(origin_id, **origin)

    # Normalize confidence (assumed 0-100)
    conf_norm = max(0.0, min(1.0, float(confidence) / 100.0))

    # 5. Amplifiers
    n_amplifiers = random.randint(3, min(8, 4 + len(flags)))
    amplifier_ids: List[str] = []
    for i in range(n_amplifiers):
        amp_id = f"amp_{i}"
        # Bot score influenced by confidence: higher synthetic confidence -> higher bot_score
        amp_score = random.uniform(0.45, 0.8) + (0.25 * conf_norm)
        amp_score = max(0.0, min(0.99, amp_score))

        node_country = _pick_country(origin_region, i, random)
        amp = {
            "id": amp_id,
            "label": f"@{_rand_handle()}",
            "bot_score": round(amp_score, 2),
            "country": node_country,
            "region_color": _get_region_color(node_country, REGION_COUNTRIES),
            "account_age_days": random.randint(1, 365),
            "follower_count": random.randint(120, 2500),
            "type": "amplifier",
        }
        G.add_node(amp_id, **amp)
        amplifier_ids.append(amp_id)

        G.add_edge(
            origin_id,
            amp_id,
            weight=float(random.uniform(0.5, 1.0)),
            timestamp_offset=int(random.randint(30, 900)),
        )

    # 6. Propagators
    n_propagators = random.randint(10, 30)
    propagator_ids: List[str] = []
    for i in range(n_propagators):
        prop_id = f"prop_{i}"
        node_country = _pick_country(origin_region, i, random)
        prop = {
            "id": prop_id,
            "label": f"@{_rand_handle()}",
            "bot_score": round(random.uniform(0.2, 0.85), 2),
            "country": node_country,
            "region_color": _get_region_color(node_country, REGION_COUNTRIES),
            "account_age_days": random.randint(1, 1500),
            "follower_count": random.randint(20, 1200),
            "type": "propagator",
        }
        G.add_node(prop_id, **prop)
        propagator_ids.append(prop_id)

        # Connect to a random amplifier or existing propagator (created earlier)
        possible_sources: List[str] = amplifier_ids + propagator_ids[:-1]
        if not possible_sources:
            possible_sources = [origin_id]
        src = random.choice(possible_sources)

        G.add_edge(
            src,
            prop_id,
            weight=float(random.uniform(0.15, 1.0)),
            timestamp_offset=int(random.randint(30, 3600)),
        )

    # 7. Extract nodes and edges
    nodes_data: List[Dict[str, Any]] = []
    for node_id, data in G.nodes(data=True):
        nodes_data.append(
            {
                "id": node_id,
                "label": data.get("label", node_id),
                "bot_score": float(data.get("bot_score", 0.0)),
                "country": data.get("country", "unknown"),
                "region_color": data.get("region_color"),
                "type": data.get("type", "unknown"),
                "follower_count": int(data.get("follower_count", 0)),
            }
        )

    edges_data: List[Dict[str, Any]] = []
    for src, dst, data in G.edges(data=True):
        edges_data.append(
            {
                "source": src,
                "target": dst,
                "timestamp_offset": int(data.get("timestamp_offset", 0)),
                "weight": float(data.get("weight", 0.0)),
            }
        )

    # 8. Bot count
    bot_count = sum(1 for _, d in G.nodes(data=True) if float(d.get("bot_score", 0.0)) > 0.65)

    # Reach estimate (sum follower_counts)
    reach_estimate = sum(int(d.get("follower_count", 0)) for _, d in G.nodes(data=True))

    # Count countries across all nodes
    country_distribution: Dict[str, int] = {}
    for node in nodes_data:
        c = node.get("country", "Unknown") or "Unknown"
        country_distribution[c] = country_distribution.get(c, 0) + 1

    # 9. Return dict
    return {
        "nodes": nodes_data,
        "edges": edges_data,
        "stats": {
            "total_nodes": int(len(G.nodes)),
            "total_edges": int(len(G.edges)),
            "bot_account_count": int(bot_count),
            "reach_estimate": int(reach_estimate),
            "peak_spread_minutes": int(random.randint(8, 45)),
            "origin_country": origin_country,
            "country_distribution": country_distribution,
            "origin_region": origin_region,
        },
        "graph_summary": (
            f"Content detected as {round(confidence)}% likely synthetic. "
            f"Spread to {len(G.nodes)} accounts within simulated timeframe. "
            f"{bot_count} accounts flagged as likely automated."
        ),
    }


def get_top_spreaders(graph_dict: Dict[str, Any], n: int = 5) -> List[Dict[str, Any]]:
    """
    Return the top-N nodes with the highest bot_score.

    Args:
        graph_dict: Dict returned by `build_disinfo_graph`.
        n: Number of nodes to return.

    Returns:
        A list of node dicts (from graph_dict["nodes"]) sorted by bot_score desc.
    """

    nodes = graph_dict.get("nodes") or []
    if not isinstance(nodes, list):
        return []

    def _score(node: Any) -> float:
        try:
            return float(node.get("bot_score", 0.0))
        except Exception:
            return 0.0

    ranked = sorted(
        [node for node in nodes if isinstance(node, dict)],
        key=_score,
        reverse=True,
    )
    return ranked[: max(0, int(n))]
