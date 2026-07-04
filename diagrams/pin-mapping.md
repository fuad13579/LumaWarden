# LumaWarden Wokwi Pin Mapping

This circuit represents one office room with 2 fans and 3 lights.

## Input Pins

| Device | Input Component | ESP32 Pin |
|---|---|---:|
| Fan 1 | Slide switch | GPIO 18 |
| Fan 2 | Slide switch | GPIO 19 |
| Light 1 | Slide switch | GPIO 21 |
| Light 2 | Slide switch | GPIO 22 |
| Light 3 | Slide switch | GPIO 23 |

## Output Pins

| Device | Output Indicator | ESP32 Pin |
|---|---|---:|
| Fan 1 | LED indicator | GPIO 26 |
| Fan 2 | LED indicator | GPIO 27 |
| Light 1 | LED indicator | GPIO 13 |
| Light 2 | LED indicator | GPIO 12 |
| Light 3 | LED indicator | GPIO 14 |

## Current Sensor Concept

| Component | Purpose | ESP32 Pin |
|---|---|---:|
| Potentiometer | Simulated current sensor output | GPIO 34 |