# --------------------------------------
# BEGIN: Jedi Semantic Tokens Feature
# --------------------------------------

import enum
from typing import NamedTuple, List, Optional
from ._vendor.lsprotocol.types import (
    TEXT_DOCUMENT_SEMANTIC_TOKENS_FULL,
    SemanticTokensLegend,
    SemanticTokensParams,
    SemanticTokens,
)


# 1) Define your token types & modifiers exactly as in your snippet
class TokenType(enum.IntEnum):
    variable = 0
    keyword = enum.auto()
    module = enum.auto()
    function = enum.auto()
    class_ = enum.auto()
    parameter = enum.auto()


class TokenModifier(enum.IntEnum):
    declaration = 0


class SemanticToken(NamedTuple):
    line: int
    start_char: int
    length: int
    token_type: TokenType
    token_modifiers: List[TokenModifier]


# 2) Build the legend lists
TOKEN_TYPES = [t.name for t in TokenType]
TOKEN_MODIFIERS = [m.name for m in TokenModifier]


# 3) Encoder: turn NamedTuples into LSP‐encoded ints
def _encode_semantic_tokens(semantic_tokens: List[SemanticToken]) -> List[int]:
    data = []
    last_line = 0
    last_start_char = 0

    for token in semantic_tokens:
        # relative line / char
        delta_line = token.line - last_line
        delta_start_char = (
            token.start_char - last_start_char if delta_line == 0 else token.start_char
        )

        # build modifier bitmask
        mask = 0
        for mod in token.token_modifiers:
            mask |= 1 << mod.value

        data.extend(
            [
                delta_line,
                delta_start_char,
                token.length,
                token.token_type.value,
                mask,
            ]
        )

        last_line = token.line
        last_start_char = token.start_char

    return data


# 4) Register the feature on your existing Positron server instance
@POSITRON.feature(
    TEXT_DOCUMENT_SEMANTIC_TOKENS_FULL,
    SemanticTokensLegend(token_types=TOKEN_TYPES, token_modifiers=TOKEN_MODIFIERS),
)
def positron_semantic_tokens_full(
    server: PositronJediLanguageServer, params: SemanticTokensParams
) -> SemanticTokens:
    logger.info("Semantic tokens full requested")
    doc = server.workspace.get_text_document(params.text_document.uri)
    # Use your existing interpreter helper to get a Jedi Interpreter
    jedi_script = _interpreter(server.project, doc, server.shell)

    # collect all names (defs & refs)
    names = jedi_script.get_names(all_scopes=True, definitions=True, references=True)
    tokens: List[SemanticToken] = []

    for name in names:
        if name.line is None or name.column is None:
            continue

        # map Jedi types → our TokenType
        def map_type(nt: str) -> Optional[TokenType]:
            if nt == "variable":
                return TokenType.variable
            elif nt == "keyword":
                return TokenType.keyword
            elif nt == "module":
                return TokenType.module
            elif nt == "function":
                return TokenType.function
            elif nt == "class":
                return TokenType.class_
            elif nt == "param":
                return TokenType.parameter
            elif nt == "statement":
                inf = name.infer()
                if inf:
                    return map_type(inf[0].type)
            return None

        tt = map_type(name.type)
        if tt is None:
            continue

        # declaration modifier if definition (but not module imports)
        mods: List[TokenModifier] = []
        if name.is_definition() and name.type != "module":
            mods.append(TokenModifier.declaration)

        # record 0‐based VSCode positions
        line0 = name.line - 1
        start = name.column
        length = len(name.name)
        tokens.append(SemanticToken(line0, start, length, tt, mods))

    # encode & return
    return SemanticTokens(_encode_semantic_tokens(tokens))


# --------------------------------------
# END: Jedi Semantic Tokens Feature
# --------------------------------------
