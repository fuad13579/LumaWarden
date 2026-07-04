# LumaWarden Circuit Explanation

This Wokwi circuit represents one room of the office monitoring system.

The ESP32 reads five slide switches representing the ON/OFF states of two fans and three lights. Each switch changes the corresponding LED indicator. The circuit also estimates total power based on device state: each fan is treated as 60W and each light as 15W.

A potentiometer is included as a conceptual analog current sensor. In a real deployment, this could be replaced by an ACS712 or similar sensor. Relay modules would be used to safely control real AC fans and lights.

This circuit is a hardware concept. The actual dashboard and Discord bot use simulated backend data, as required by the hackathon problem.