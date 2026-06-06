export const STATUS_FLOW = [
  "Created",
  "Accepted",
  "Picked Up",
  "In Transit",
  "Delivered",
  "Confirmed",
  "Completed",
];

export const NEXT_STATUS = {
  Accepted: "Picked Up",
  "Picked Up": "In Transit",
  "In Transit": "Delivered",
};

export const PACKAGE_TYPES = [
  "Parcel",
  "Fashion item",
  "Documents",
  "Electronics",
  "Food",
];

export const URGENCY_OPTIONS = ["normal", "medium", "urgent"];
