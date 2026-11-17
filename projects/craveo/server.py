"""Compillo server launcher wrapper for Craveo."""
import sys
from craveo_runtime import run_server

if __name__ == "__main__":
    default_port = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 5000
    run_server(default_port=default_port)
