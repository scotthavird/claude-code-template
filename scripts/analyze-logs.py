#!/usr/bin/env python3
"""
Claude Code Hook Log Analyzer

This script provides data science insights into Claude Code hook events.
Run this script to analyze patterns in tool usage, timing, and behavior.
"""

import argparse
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path


def load_logs(log_file):
    """Load and parse JSONL log file."""
    logs = []
    if not Path(log_file).exists():
        print(f"Log file {log_file} not found.")
        return logs
    
    with open(log_file, 'r') as f:
        for line in f:
            try:
                logs.append(json.loads(line.strip()))
            except json.JSONDecodeError:
                continue
    return logs


def analyze_tool_usage(logs):
    """Analyze tool usage patterns."""
    print("TOOL USAGE ANALYSIS")
    print("=" * 50)
    
    tool_counts = Counter(log['tool_name'] for log in logs)
    event_counts = Counter(log['event_type'] for log in logs)
    
    print(f"Total events logged: {len(logs)}")
    print(f"\nTop 10 most used tools:")
    for tool, count in tool_counts.most_common(10):
        print(f"  {tool}: {count} times")
    
    print(f"\nEvent type distribution:")
    for event, count in event_counts.most_common():
        print(f"  {event}: {count} times")
    
    return tool_counts, event_counts


def analyze_temporal_patterns(logs):
    """Analyze temporal patterns in tool usage."""
    print("\nTEMPORAL ANALYSIS")
    print("=" * 50)
    
    # Parse timestamps and group by hour
    hourly_usage = defaultdict(int)
    daily_usage = defaultdict(int)
    
    for log in logs:
        try:
            dt = datetime.fromisoformat(log['timestamp'].replace('Z', '+00:00'))
            hourly_usage[dt.hour] += 1
            daily_usage[dt.date()] += 1
        except (ValueError, KeyError):
            continue
    
    print("Usage by hour of day:")
    for hour in sorted(hourly_usage.keys()):
        bar = "█" * (hourly_usage[hour] // max(1, max(hourly_usage.values()) // 20))
        print(f"  {hour:02d}:00 {bar} ({hourly_usage[hour]})")
    
    print(f"\nUsage by day:")
    for day in sorted(daily_usage.keys()):
        print(f"  {day}: {daily_usage[day]} events")


def analyze_tool_arguments(logs):
    """Analyze common patterns in tool arguments."""
    print("\nTOOL ARGUMENTS ANALYSIS")
    print("=" * 50)
    
    # Group by tool and analyze argument patterns
    tool_args = defaultdict(list)
    for log in logs:
        tool_name = log['tool_name']
        args = log.get('tool_arguments', {})
        if args:
            tool_args[tool_name].append(args)
    
    for tool, args_list in tool_args.items():
        if len(args_list) > 0:
            print(f"\n{tool} argument patterns:")
            # Find common argument keys
            all_keys = set()
            for args in args_list:
                all_keys.update(args.keys())
            
            for key in sorted(all_keys):
                values = [args.get(key) for args in args_list if key in args]
                unique_values = len(set(str(v) for v in values))
                print(f"  {key}: {len(values)} uses, {unique_values} unique values")


def generate_summary_report(logs):
    """Generate a summary report."""
    print("\nSUMMARY REPORT")
    print("=" * 50)
    
    if not logs:
        print("No logs found to analyze.")
        return
    
    # Time range
    timestamps = []
    for log in logs:
        try:
            dt = datetime.fromisoformat(log['timestamp'].replace('Z', '+00:00'))
            timestamps.append(dt)
        except (ValueError, KeyError):
            continue
    
    if timestamps:
        start_time = min(timestamps)
        end_time = max(timestamps)
        duration = end_time - start_time
        
        print(f"Analysis period: {start_time.date()} to {end_time.date()}")
        print(f"Total duration: {duration}")
        print(f"Events per day: {len(logs) / max(1, duration.days):.1f}")
    
    # Most active tools
    tool_counts = Counter(log['tool_name'] for log in logs)
    if tool_counts:
        most_used = tool_counts.most_common(1)[0]
        print(f"Most used tool: {most_used[0]} ({most_used[1]} times)")
    
    # Event distribution
    event_counts = Counter(log['event_type'] for log in logs)
    print(f"Event types: {', '.join(event_counts.keys())}")


def main():
    parser = argparse.ArgumentParser(description='Analyze Claude Code hook logs')
    parser.add_argument('--log-file', default='logs/all-hooks.jsonl',
                        help='Path to the log file to analyze')
    parser.add_argument('--tool', help='Filter analysis to specific tool')
    parser.add_argument('--event', help='Filter analysis to specific event type')
    
    args = parser.parse_args()
    
    logs = load_logs(args.log_file)
    
    # Apply filters
    if args.tool:
        logs = [log for log in logs if log.get('tool_name') == args.tool]
        print(f"Filtered to tool: {args.tool}")
    
    if args.event:
        logs = [log for log in logs if log.get('event_type') == args.event]
        print(f"Filtered to event: {args.event}")
    
    if not logs:
        print("No logs found matching criteria.")
        return
    
    # Run analyses
    analyze_tool_usage(logs)
    analyze_temporal_patterns(logs)
    analyze_tool_arguments(logs)
    generate_summary_report(logs)


if __name__ == "__main__":
    main() 