#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
CREATE_SCRIPT="$REPO_ROOT/.specify/scripts/bash/create-new-feature.sh"
COMMON_SCRIPT="$REPO_ROOT/.specify/scripts/bash/common.sh"

assert_eq() {
    local expected="$1"
    local actual="$2"
    local message="$3"
    if [[ "$expected" != "$actual" ]]; then
        echo "ASSERTION FAILED: $message" >&2
        echo "  expected: $expected" >&2
        echo "  actual  : $actual" >&2
        exit 1
    fi
}

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local message="$3"
    if [[ "$haystack" != *"$needle"* ]]; then
        echo "ASSERTION FAILED: $message" >&2
        echo "  expected to contain: $needle" >&2
        echo "  actual            : $haystack" >&2
        exit 1
    fi
}

# JSON文字列から最小限の値を取り出す（jq非依存）
extract_json_value() {
    local json="$1"
    local key="$2"
    echo "$json" | sed -n "s/.*\"$key\":\"\\([^\"]*\\)\".*/\\1/p"
}

test_create_new_feature_uses_yyyymmdd_prefix_and_japanese_name() {
    local tmp
    tmp="$(mktemp -d)"

    mkdir -p "$tmp/.specify/templates"
    cat > "$tmp/.specify/templates/spec-template.md" <<'EOF'
# test template
EOF

    git -C "$tmp" init >/dev/null 2>&1

    local today
    today="$(date +%Y%m%d)"

    local json
    json="$(cd "$tmp" && "$CREATE_SCRIPT" --json --short-name "腕トレ-追加" "腕トレ記録を追加")"

    local branch_name
    branch_name="$(extract_json_value "$json" "BRANCH_NAME")"
    local spec_file
    spec_file="$(extract_json_value "$json" "SPEC_FILE")"

    assert_eq "${today}-腕トレ-追加" "$branch_name" "BRANCH_NAME must follow yyyymmdd-[機能名]"
    assert_contains "$spec_file" "specs/${today}-腕トレ-追加/spec.md" "SPEC_FILE path must follow yyyymmdd-[機能名]"

    rm -rf "$tmp"
}

test_common_functions_accept_new_branch_format() {
    local today
    today="$(date +%Y%m%d)"

    # shellcheck disable=SC1090
    source "$COMMON_SCRIPT"

    check_feature_branch "${today}-胸トレ改善" "true"

    local tmp
    tmp="$(mktemp -d)"

    mkdir -p "$tmp/specs/${today}-胸トレ改善"

    local found
    found="$(find_feature_dir_by_prefix "$tmp" "${today}-別ブランチ名")"
    assert_eq "$tmp/specs/${today}-胸トレ改善" "$found" "date prefix based lookup should resolve the existing spec directory"

    rm -rf "$tmp"
}

main() {
    test_create_new_feature_uses_yyyymmdd_prefix_and_japanese_name
    test_common_functions_accept_new_branch_format
    echo "All naming convention tests passed"
}

main "$@"
