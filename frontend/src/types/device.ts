// These TypeScript types mirror the backend TypedDicts. Keeping the shapes in
// sync makes it clear what each API response contains without digging through
// the implementation first.
export type Device = {
  id: string;
  name: string;
  room: "Drawing Room" | "Work Room 1" | "Work Room 2";
  type: "fan" | "light";
  status: "on" | "off";
  power_watts: number;
  last_changed: string;
};

export type Usage = {
  // Current live wattage across the office, broken down by room.
  total_watts: number;
  rooms: {
    "Drawing Room": number;
    "Work Room 1": number;
    "Work Room 2": number;
  };
};

export type Alert = {
  // Alerts are rendered as read-only records in the UI. The backend decides
  // when they exist and the frontend just formats them.
  id: string;
  type: "after_hours" | "long_running_room";
  severity: "medium" | "high";
  message: string;
  room: string;
  device_id: string | null;
  created_at: string;
};

export type Snapshot = {
  // The dashboard treats the snapshot as the authoritative bundle of live data.
  devices: Device[];
  usage: Usage;
  alerts: Alert[];
};

export type WasteDaySummary = {
  // Daily energy totals are displayed in kWh for the dashboard and the bot.
  date: string;
  watt_hours: number;
  kwh: number;
  rooms: Record<
    Device["room"],
    {
      watt_hours: number;
      devices: Record<string, number>;
    }
  >;
};

export type WasteSummary = {
  // The summary endpoint returns both historical waste and session-based totals.
  office_hours: {
    start_hour: number;
    end_hour: number;
  };
  previous_day: WasteDaySummary;
  today: WasteDaySummary;
  today_usage: WasteDaySummary;
  dashboard_estimate_kwh: number;
};

export type ConnectionState = "connected" | "reconnecting" | "polling";
