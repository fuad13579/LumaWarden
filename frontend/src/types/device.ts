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
  total_watts: number;
  rooms: {
    "Drawing Room": number;
    "Work Room 1": number;
    "Work Room 2": number;
  };
};

export type Alert = {
  id: string;
  type: "after_hours" | "long_running_room";
  severity: "medium" | "high";
  message: string;
  room: string;
  device_id: string | null;
  created_at: string;
};

export type Snapshot = {
  devices: Device[];
  usage: Usage;
  alerts: Alert[];
};

export type WasteDaySummary = {
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
  office_hours: {
    start_hour: number;
    end_hour: number;
  };
  previous_day: WasteDaySummary;
  today: WasteDaySummary;
};

export type ConnectionState = "connected" | "reconnecting" | "polling";
