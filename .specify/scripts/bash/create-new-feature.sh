#!/usr/bin/env bash

set -e

JSON_MODE=false
SHORT_NAME=""
FEATURE_DATE_OVERRIDE=""
ARGS=()
i=1
while [ $i -le $# ]; do
    arg="${!i}"
    case "$arg" in
        --json) 
            JSON_MODE=true 
            ;;
        --short-name)
            if [ $((i + 1)) -gt $# ]; then
                echo 'Error: --short-name requires a value' >&2
                exit 1
            fi
            i=$((i + 1))
            next_arg="${!i}"
            # Check if the next argument is another option (starts with --)
            if [[ "$next_arg" == --* ]]; then
                echo 'Error: --short-name requires a value' >&2
                exit 1
            fi
            SHORT_NAME="$next_arg"
            ;;
        --date|--number)
            if [ $((i + 1)) -gt $# ]; then
                echo 'Error: --date requires a value (yyyymmdd)' >&2
                exit 1
            fi
            i=$((i + 1))
            next_arg="${!i}"
            if [[ "$next_arg" == --* ]]; then
                echo 'Error: --date requires a value (yyyymmdd)' >&2
                exit 1
            fi
            FEATURE_DATE_OVERRIDE="$next_arg"
            ;;
        --help|-h) 
            echo "Usage: $0 [--json] [--short-name <name>] [--date yyyymmdd] <feature_description>"
            echo ""
            echo "Options:"
            echo "  --json              Output in JSON format"
            echo "  --short-name <name> Provide a custom feature name for the branch/spec directory"
            echo "  --date yyyymmdd     Specify date prefix manually (default: today)"
            echo "  --number yyyymmdd   Deprecated alias of --date"
            echo "  --help, -h          Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 '腕トレ記録を追加' --short-name '腕トレ-追加'"
            echo "  $0 'Add user authentication system' --date 20260222"
            exit 0
            ;;
        *) 
            ARGS+=("$arg") 
            ;;
    esac
    i=$((i + 1))
done

FEATURE_DESCRIPTION="${ARGS[*]}"
if [ -z "$FEATURE_DESCRIPTION" ]; then
    echo "Usage: $0 [--json] [--short-name <name>] [--date yyyymmdd] <feature_description>" >&2
    exit 1
fi

# Function to find the repository root by searching for existing project markers
find_repo_root() {
    local dir="$1"
    while [ "$dir" != "/" ]; do
        if [ -d "$dir/.git" ] || [ -d "$dir/.specify" ]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    return 1
}

# 機能名をブランチ/ディレクトリに使える形に正規化（日本語は保持）
clean_feature_name() {
    local name="$1"
    local cleaned

    cleaned="$(echo "$name" \
        | tr '\t\r\n' '   ' \
        | sed -E 's/[[:space:]]+/-/g' \
        | sed -E 's#[/\\]+#-#g' \
        | sed -E 's/[~^:?*\[\]]+/-/g' \
        | sed -E 's/@\{/-/g' \
        | sed -E "s/[\"']//g" \
        | sed -E 's/\.\.+/-/g' \
        | sed -E 's/-+/-/g; s/^-+//; s/-+$//')"

    if [ -z "$cleaned" ]; then
        cleaned="feature"
    fi

    if [[ "$cleaned" == *.lock ]]; then
        cleaned="${cleaned}-feature"
    fi

    echo "$cleaned"
}

# Resolve repository root. Prefer git information when available, but fall back
# to searching for repository markers so the workflow still functions in repositories that
# were initialised with --no-git.
SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if git rev-parse --show-toplevel >/dev/null 2>&1; then
    REPO_ROOT=$(git rev-parse --show-toplevel)
    HAS_GIT=true
else
    REPO_ROOT="$(find_repo_root "$SCRIPT_DIR")"
    if [ -z "$REPO_ROOT" ]; then
        echo "Error: Could not determine repository root. Please run this script from within the repository." >&2
        exit 1
    fi
    HAS_GIT=false
fi

cd "$REPO_ROOT"

SPECS_DIR="$REPO_ROOT/specs"
mkdir -p "$SPECS_DIR"

# 説明文をそのまま機能名として扱い、禁止文字だけ除去
generate_feature_name() {
    local description="$1"
    clean_feature_name "$description"
}

# 機能名を決定
if [ -n "$SHORT_NAME" ]; then
    BRANCH_SUFFIX=$(clean_feature_name "$SHORT_NAME")
else
    BRANCH_SUFFIX=$(generate_feature_name "$FEATURE_DESCRIPTION")
fi

# 日付プレフィックスを決定
if [ -n "$FEATURE_DATE_OVERRIDE" ]; then
    if [[ ! "$FEATURE_DATE_OVERRIDE" =~ ^[0-9]{8}$ ]]; then
        echo "Error: --date must be yyyymmdd format" >&2
        exit 1
    fi
    FEATURE_DATE="$FEATURE_DATE_OVERRIDE"
else
    FEATURE_DATE="$(date +%Y%m%d)"
fi

BRANCH_NAME="${FEATURE_DATE}-${BRANCH_SUFFIX}"

# GitHub enforces a 244-byte limit on branch names
MAX_BRANCH_LENGTH=244
if [ ${#BRANCH_NAME} -gt $MAX_BRANCH_LENGTH ]; then
    >&2 echo "[specify] Error: Branch name exceeded GitHub's 244-byte limit (${#BRANCH_NAME} bytes)"
    >&2 echo "[specify] Please provide a shorter feature name with --short-name."
    exit 1
fi

if [ "$HAS_GIT" = true ]; then
    if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
        >&2 echo "[specify] Error: Branch already exists: $BRANCH_NAME"
        exit 1
    fi

    if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH_NAME"; then
        >&2 echo "[specify] Error: Remote branch already exists: $BRANCH_NAME"
        exit 1
    else
        git fetch --all --prune >/dev/null 2>&1 || true
        if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH_NAME"; then
            >&2 echo "[specify] Error: Remote branch already exists: $BRANCH_NAME"
            exit 1
        fi
    fi
fi

#if [ "$HAS_GIT" = true ]; then
#    git checkout -b "$BRANCH_NAME"
#else
#    >&2 echo "[specify] Warning: Git repository not detected; skipped branch creation for $BRANCH_NAME"
#fi

FEATURE_DIR="$SPECS_DIR/$BRANCH_NAME"
if [ -d "$FEATURE_DIR" ]; then
    >&2 echo "[specify] Error: Feature directory already exists: $FEATURE_DIR"
    exit 1
fi
mkdir -p "$FEATURE_DIR"

TEMPLATE="$REPO_ROOT/.specify/templates/spec-template.md"
SPEC_FILE="$FEATURE_DIR/spec.md"
if [ -f "$TEMPLATE" ]; then cp "$TEMPLATE" "$SPEC_FILE"; else touch "$SPEC_FILE"; fi

# Set the SPECIFY_FEATURE environment variable for the current session
export SPECIFY_FEATURE="$BRANCH_NAME"

if $JSON_MODE; then
    printf '{"BRANCH_NAME":"%s","SPEC_FILE":"%s","FEATURE_DATE":"%s"}\n' "$BRANCH_NAME" "$SPEC_FILE" "$FEATURE_DATE"
else
    echo "BRANCH_NAME: $BRANCH_NAME"
    echo "SPEC_FILE: $SPEC_FILE"
    echo "FEATURE_DATE: $FEATURE_DATE"
    echo "SPECIFY_FEATURE environment variable set to: $BRANCH_NAME"
fi
