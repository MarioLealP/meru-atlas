"""YAML loading shared by the parsers."""

from pathlib import Path
from typing import Any

import yaml


class LooseLoader(yaml.SafeLoader):
    """Authentik blueprints use custom tags (!KeyOf, !Find, !Env ...): keep them as plain values."""


def _any_tag(loader: yaml.SafeLoader, _suffix: str, node: yaml.Node) -> Any:
    if isinstance(node, yaml.ScalarNode):
        return loader.construct_scalar(node)
    if isinstance(node, yaml.SequenceNode):
        return loader.construct_sequence(node)
    if isinstance(node, yaml.MappingNode):
        return loader.construct_mapping(node)
    raise yaml.constructor.ConstructorError(
        None, None, f"unexpected node {type(node).__name__}", node.start_mark
    )


LooseLoader.add_multi_constructor("!", _any_tag)


def load_all(path: Path, loose: bool = False) -> list[Any]:
    with path.open(encoding="utf-8-sig") as f:
        return list(yaml.load_all(f, Loader=LooseLoader if loose else yaml.SafeLoader))
