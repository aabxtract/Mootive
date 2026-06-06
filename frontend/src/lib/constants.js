export const STATUSES = {
  CREATED:           { label: 'Created',           tone: 'slate'  },
  ANALYZED:          { label: 'Riders Analyzed',   tone: 'indigo' },
  OPEN_FOR_DRIVERS:  { label: 'Open for Drivers',  tone: 'amber'  },
  DRIVER_ACCEPTED:   { label: 'Driver Accepted',   tone: 'blue'   },
  ROUTE_OPTIMIZED:   { label: 'Route Ready',       tone: 'sky'    },
  PICKED_UP:         { label: 'Picked Up',         tone: 'orange' },
  IN_TRANSIT:        { label: 'In Transit',        tone: 'orange' },
  DELIVERED:         { label: 'Delivered',         tone: 'green'  },
  CONFIRMED:         { label: 'Confirmed',         tone: 'green'  },
  COMPLETED:         { label: 'Completed',         tone: 'green'  },
  ISSUE_REPORTED:    { label: 'Issue Reported',    tone: 'red'    },
};

export const STATUS_ORDER = [
  'CREATED','ANALYZED','OPEN_FOR_DRIVERS','DRIVER_ACCEPTED',
  'ROUTE_OPTIMIZED','PICKED_UP','IN_TRANSIT','DELIVERED','CONFIRMED','COMPLETED',
];

export const PACKAGE_TYPES = [
  { value: 'Fashion item', label: '👕 Fashion item' },
  { value: 'Food',         label: '🍲 Food'         },
  { value: 'Document',     label: '📄 Document'     },
  { value: 'Gadget',       label: '💻 Gadget'       },
  { value: 'Medicine',     label: '💊 Medicine'     },
  { value: 'Other',        label: '📦 Other'        },
];

export const URGENCY_LEVELS = [
  { value: 'normal',   label: 'Normal',   desc: '1–2 days' },
  { value: 'same day', label: 'Same day', desc: '3–6 hrs'  },
  { value: 'urgent',   label: 'Urgent',   desc: '1–2 hrs'  },
];

export const VEHICLE_TYPES = ['motorcycle', 'car', 'van', 'keke'];

export function formatNaira(val) {
  if (val == null || val === '') return '₦0';
  return '₦' + Number(val).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}
