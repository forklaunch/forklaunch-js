#!/bin/bash

# Script to compare files between two directories
# Reports files that have identical content and optionally creates symlinks

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to show usage
show_usage() {
    echo "Usage: $0 <source_dir> <target_dir>"
    echo ""
    echo "Compare files between source and target directories."
    echo "After analysis, optionally create symlinks for identical files from source to target."
    echo ""
    echo "Arguments:"
    echo "  source_dir    Source directory path"
    echo "  target_dir    Target directory path"
    echo ""
    echo "Example:"
    echo "  $0 ./iam-base ./iam-better-auth"
}

# Check arguments
if [[ $# -ne 2 ]]; then
    echo -e "${RED}Error: Invalid number of arguments${NC}"
    show_usage
    exit 1
fi

SOURCE_DIR="$1"
TARGET_DIR="$2"

# Convert to absolute paths
SOURCE_DIR=$(realpath "$SOURCE_DIR")
TARGET_DIR=$(realpath "$TARGET_DIR")

# Check if directories exist
if [[ ! -d "$SOURCE_DIR" ]]; then
    echo -e "${RED}Error: Source directory '$SOURCE_DIR' does not exist${NC}"
    exit 1
fi

if [[ ! -d "$TARGET_DIR" ]]; then
    echo -e "${RED}Error: Target directory '$TARGET_DIR' does not exist${NC}"
    exit 1
fi

echo "Comparing files between directories..."
echo "Source: $SOURCE_DIR"
echo "Target: $TARGET_DIR"
echo "============================================================"

# Temporary files to store file lists
source_files_list=$(mktemp)
target_files_list=$(mktemp)
common_files_list=$(mktemp)
identical_files_list=$(mktemp)

# Cleanup function
cleanup() {
    rm -f "$source_files_list" "$target_files_list" "$common_files_list" "$identical_files_list"
}
trap cleanup EXIT

# Function to get relative path and store in file
get_files_list() {
    local dir="$1"
    local output_file="$2"
    
    find "$dir" -type f \
        -not -path "*/node_modules/*" \
        -not -path "*/dist/*" \
        -not -path "*/.git/*" \
        -not -path "*/temp/*" \
        -exec bash -c 'echo "${1#'"$dir"'/}"' _ {} \; | sort > "$output_file"
}

echo "Scanning directories..."

# Get file lists
get_files_list "$SOURCE_DIR" "$source_files_list"
get_files_list "$TARGET_DIR" "$target_files_list"

# Find common files
comm -12 "$source_files_list" "$target_files_list" > "$common_files_list"

# Count variables
identical_count=0
different_count=0

# Arrays to store results (using simple arrays)
identical_files=""
different_files=""

echo "Comparing common files..."

# Compare each common file
while IFS= read -r file; do
    if [[ -n "$file" ]]; then
        source_file_path="$SOURCE_DIR/$file"
        target_file_path="$TARGET_DIR/$file"
        
        if cmp -s "$source_file_path" "$target_file_path"; then
            identical_files="$identical_files$file\n"
            echo "$file" >> "$identical_files_list"
            ((identical_count++))
        else
            different_files="$different_files$file\n"
            ((different_count++))
        fi
    fi
done < "$common_files_list"

# Print results
echo ""

if [[ $identical_count -gt 0 ]]; then
    echo -e "${GREEN}✅ IDENTICAL FILES ($identical_count):${NC}"
    echo "----------------------------------------"
    echo -e "$identical_files" | sort
fi

if [[ $different_count -gt 0 ]]; then
    echo -e "${RED}❌ DIFFERENT FILES ($different_count):${NC}"
    echo "----------------------------------------"
    echo -e "$different_files" | sort
fi

# Files only in source
source_only_count=$(comm -23 "$source_files_list" "$target_files_list" | wc -l | tr -d ' ')
if [[ $source_only_count -gt 0 ]]; then
    echo -e "${YELLOW}📁 FILES ONLY IN SOURCE ($source_only_count):${NC}"
    echo "----------------------------------------"
    comm -23 "$source_files_list" "$target_files_list"
    echo ""
fi

# Files only in target
target_only_count=$(comm -13 "$source_files_list" "$target_files_list" | wc -l | tr -d ' ')
if [[ $target_only_count -gt 0 ]]; then
    echo -e "${YELLOW}📁 FILES ONLY IN TARGET ($target_only_count):${NC}"
    echo "----------------------------------------"
    comm -13 "$source_files_list" "$target_files_list"
    echo ""
fi

# Summary
total_common=$((identical_count + different_count))
echo -e "${BLUE}📊 SUMMARY:${NC}"
echo "  Total common files: $total_common"
echo "  Identical files: $identical_count"
echo "  Different files: $different_count"
echo "  Files only in source: $source_only_count"
echo "  Files only in target: $target_only_count"

# Ask about creating symlinks for identical files
if [[ $identical_count -gt 0 ]]; then
    echo ""
    echo -e "${BLUE}🔗 SYMLINK OPTION:${NC}"
    echo "Found $identical_count identical files that could be symlinked from source to target."
    echo "This will replace the target files with symlinks pointing to the source files."
    echo ""
    read -p "Do you want to create symlinks for identical files? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${BLUE}Creating symlinks...${NC}"
        
        symlink_count=0
        failed_count=0
        
        while IFS= read -r file; do
            if [[ -n "$file" ]]; then
                source_file_path="$SOURCE_DIR/$file"
                target_file_path="$TARGET_DIR/$file"
                
                # Only create symlink if target file exists (we're replacing identical files)
                if [[ ! -f "$target_file_path" ]]; then
                    echo -e "${YELLOW}⚠${NC} Skipping $file (target file does not exist)"
                    continue
                fi
                
                # Create directory structure if it doesn't exist
                target_dir=$(dirname "$target_file_path")
                mkdir -p "$target_dir"
                
                # Calculate relative path from target to source
                target_relative_path=$(dirname "$file")
                if [[ "$target_relative_path" == "." ]]; then
                    # File is in root directory
                    relative_source_path="../$(basename "$SOURCE_DIR")/$file"
                else
                    # File is in subdirectory - need to go up the right number of levels
                    levels=$(echo "$target_relative_path" | tr '/' '\n' | wc -l | tr -d ' ')
                    up_path=""
                    for ((i=0; i<levels; i++)); do
                        up_path="../$up_path"
                    done
                    relative_source_path="${up_path}../$(basename "$SOURCE_DIR")/$file"
                fi
                
                # Remove existing target file and create relative symlink
                if rm -f "$target_file_path" && ln -s "$relative_source_path" "$target_file_path"; then
                    echo -e "${GREEN}✓${NC} $file -> $relative_source_path"
                    ((symlink_count++))
                else
                    echo -e "${RED}✗${NC} Failed to symlink $file"
                    ((failed_count++))
                fi
            fi
        done < "$identical_files_list"
        
        echo ""
        echo -e "${BLUE}📊 SYMLINK SUMMARY:${NC}"
        echo "  Successfully created: $symlink_count symlinks"
        if [[ $failed_count -gt 0 ]]; then
            echo -e "  ${RED}Failed: $failed_count symlinks${NC}"
        fi
        
        if [[ $symlink_count -gt 0 ]]; then
            echo ""
            echo -e "${GREEN}✅ Symlinks created successfully!${NC}"
            echo "Target files now point to source files for identical content."
        fi
    else
        echo "Symlink creation skipped."
    fi
fi
