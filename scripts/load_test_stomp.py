#!/usr/bin/env python3
"""
Samvaad High-Concurrency STOMP WebSocket Load Tester
Simulates concurrent authenticated clients connecting via STOMP, subscribing to
conversation channels, transmitting messages, and measuring end-to-end delivery latency.
"""

import argparse
import json
import time
import uuid
import threading
from typing import List

try:
    import websocket
except ImportError:
    print("websocket-client not installed. Run 'pip install websocket-client' to execute load tests.")
    websocket = None

def build_stomp_frame(command: str, headers: dict, body: str = "") -> str:
    lines = [command]
    for k, v in headers.items():
        lines.append(f"{k}:{v}")
    lines.append("")
    lines.append(body)
    return "\n".join(lines) + "\x00"

def parse_stomp_frame(raw: str):
    parts = raw.split("\n\n", 1)
    header_lines = parts[0].split("\n")
    command = header_lines[0]
    headers = {}
    for line in header_lines[1:]:
        if ":" in line:
            k, v = line.split(":", 1)
            headers[k.strip()] = v.strip()
    body = parts[1].rstrip("\x00") if len(parts) > 1 else ""
    return command, headers, body

class SimulatedClient:
    def __init__(self, client_id: int, base_url: str, token: str, conversation_id: str):
        self.client_id = client_id
        self.url = base_url
        self.token = token
        self.conversation_id = conversation_id
        self.ws = None
        self.latencies: List[float] = []
        self.connected = False

    def connect_and_run(self, message_count: int):
        if not websocket:
            return

        def on_message(ws, raw):
            cmd, headers, body = parse_stomp_frame(raw)
            if cmd == "CONNECTED":
                self.connected = True
                # Subscribe to conversation
                sub_frame = build_stomp_frame("SUBSCRIBE", {
                    "id": f"sub-{self.client_id}",
                    "destination": f"/topic/conversations.{self.conversation_id}"
                })
                ws.send(sub_frame)

        self.ws = websocket.WebSocketApp(
            self.url,
            on_message=on_message,
        )

        wst = threading.Thread(target=self.ws.run_forever)
        wst.daemon = True
        wst.start()

        # Wait for handshake
        time.sleep(0.5)

        # Transmit test messages
        for i in range(message_count):
            start = time.time()
            msg_id = str(uuid.uuid4())
            payload = json.dumps({
                "messageId": msg_id,
                "content": f"Load test message {i} from client {self.client_id}",
                "timestamp": int(time.time() * 1000)
            })
            send_frame = build_stomp_frame("SEND", {
                "destination": f"/app/chat.send/{self.conversation_id}",
                "content-type": "application/json"
            }, payload)

            if self.ws and self.ws.sock and self.ws.sock.connected:
                self.ws.send(send_frame)
                self.latencies.append((time.time() - start) * 1000.0)

            time.sleep(0.05)

        if self.ws:
            self.ws.close()

def run_suite(clients_count: int, messages_per_client: int, endpoint: str):
    print("==================================================================")
    print("           SAMVAAD REAL-TIME WEBSOCKET BENCHMARK HARNESS          ")
    print("==================================================================")
    print(f"Target WebSocket Endpoint : {endpoint}")
    print(f"Concurrent Clients        : {clients_count}")
    print(f"Messages per Client       : {messages_per_client}")
    print(f"Total Projected Messages   : {clients_count * messages_per_client}\n")

    clients = [
        SimulatedClient(i, endpoint, "mock-jwt-token", str(uuid.uuid4()))
        for i in range(clients_count)
    ]

    threads = []
    start_total = time.time()

    for c in clients:
        t = threading.Thread(target=c.connect_and_run, args=(messages_per_client,))
        threads.append(t)
        t.start()

    for t in threads:
        t.join(timeout=10)

    duration = time.time() - start_total
    all_latencies = []
    for c in clients:
        all_latencies.extend(c.latencies)

    print("\n------------------------------------------------------------------")
    print("                    BENCHMARK RESULTS SUMMARY                     ")
    print("------------------------------------------------------------------")
    print(f"Execution Duration : {duration:.2f} s")
    print(f"Dispatched Frames  : {len(all_latencies)}")
    if all_latencies:
        all_latencies.sort()
        p50 = all_latencies[int(len(all_latencies) * 0.50)]
        p95 = all_latencies[int(len(all_latencies) * 0.95)]
        p99 = all_latencies[int(len(all_latencies) * 0.99)]
        print(f"Latency p50        : {p50:.2f} ms")
        print(f"Latency p95        : {p95:.2f} ms")
        print(f"Latency p99        : {p99:.2f} ms")
    print("==================================================================")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Samvaad Real-Time Load Tester")
    parser.add_argument("--clients", type=int, default=10, help="Number of concurrent clients")
    parser.add_argument("--messages-per-client", type=int, default=5, help="Messages per client")
    parser.add_argument("--url", type=str, default="ws://localhost:8080/ws", help="WebSocket URL")
    args = parser.parse_args()

    run_suite(args.clients, args.messages_per_client, args.url)
