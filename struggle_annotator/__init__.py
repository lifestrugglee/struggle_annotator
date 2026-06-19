from __future__ import annotations

import os
import streamlit.components.v1 as components

# Set to False during local frontend development (points at Vite dev server).
_RELEASE = True

if not _RELEASE:
    _component_func = components.declare_component(
        "txt_annotator",
        url="http://localhost:5173",
    )
else:
    _build_dir = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "frontend", "build"
    )
    _component_func = components.declare_component("txt_annotator", path=_build_dir)


def txt_annotator(
    text: str,
    label_dict: dict,
    spacing: float = 1.9,
    label_position: str = "top",
    auto_expand: bool = True,
    key: str | None = None,
) -> dict:
    """Interactive NER-style text annotation component.

    Parameters
    ----------
    text:
        The raw text to annotate. Offsets are code-point–based Python str indices.
    label_dict:
        Entity definitions. Keys are label names; values must contain ``color``
        (any valid CSS color) and optionally ``annotation`` (list of
        ``{"start": int, "end": int, "value": str}`` dicts).
    spacing:
        Initial line-height of the text area (1.2 – 5.0). Default ``1.9``.
    label_position:
        Where to render the entity buttons — ``"top"``, ``"left"``, or ``"right"``.
        Default ``"top"``.
    auto_expand:
        When ``True`` (default), selections are expanded to full word boundaries.
    key:
        Standard Streamlit component key — required when rendering multiple
        annotators on the same page.

    Returns
    -------
    dict
        Updated ``label_dict`` with each entity's ``annotation`` list reflecting
        the current UI state. Annotations within each entity are sorted by ``start``.
    """
    if label_position not in ("top", "left", "right"):
        raise ValueError(f"label_position must be 'top', 'left', or 'right', got {label_position!r}")

    normalised = {
        label: {
            "color": cfg["color"],
            "annotation": list(cfg.get("annotation", [])),
        }
        for label, cfg in label_dict.items()
    }
    result = _component_func(
        text=text,
        label_dict=normalised,
        spacing=float(spacing),
        label_position=label_position,
        auto_expand=bool(auto_expand),
        key=key,
        default=normalised,
    )
    return result if result is not None else normalised
