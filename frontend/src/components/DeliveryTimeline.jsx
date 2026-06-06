import { useMemo } from 'react';
import { User, Truck, Package, Navigation, CheckCircle2, ClipboardCheck, AlertTriangle } from 'lucide-react';

const NODES = [
  { key: 'CREATED', title: 'Seller', icon: User, getDesc: (d) => `Delivery request created${d.senderName ? ` by ${d.senderName}` : ''}.` },
  { key: 'DRIVER_ACCEPTED', title: 'Driver Accepted', icon: Truck, getDesc: (d) => `${d.recommendedDriverName || d.aiRecommendation?.recommendedDriverName || 'A driver'} accepted the delivery job.` },
  { key: 'PICKED_UP', title: 'Picked Up', icon: Package, getDesc: (d) => `Driver picked up the package from ${d.pickupArea || 'pickup location'}.` },
  { key: 'IN_TRANSIT', title: 'On the Way', icon: Navigation, getDesc: (d) => `Package is moving to ${d.dropoffArea || 'drop-off location'}.` },
  { key: 'DELIVERED', title: 'Delivered', icon: CheckCircle2, getDesc: () => 'Driver marked package as delivered.' },
  { key: 'CONFIRMED', title: 'Receiver Confirmed', icon: ClipboardCheck, getDesc: () => 'Receiver confirmed package received.' },
  { key: 'COMPLETED', title: 'Completed', icon: CheckCircle2, getDesc: () => 'Delivery successfully completed.' },
];

function getStatusIndex(status) {
  if (['CREATED', 'ANALYZED', 'OPEN_FOR_DRIVERS'].includes(status)) return 0;
  if (['DRIVER_ACCEPTED', 'ROUTE_OPTIMIZED'].includes(status)) return 1;
  if (status === 'PICKED_UP') return 2;
  if (status === 'IN_TRANSIT') return 3;
  if (status === 'DELIVERED') return 4;
  if (status === 'CONFIRMED') return 5;
  if (status === 'COMPLETED') return 6;
  return 0;
}

function buildNodes(delivery, events) {
  const activeIdx = getStatusIndex(delivery?.status);
  return NODES.map((node, i) => {
    const nodeStatus = delivery?.status === 'COMPLETED' ? 'completed'
      : i < activeIdx ? 'completed'
      : i === activeIdx ? 'active'
      : 'pending';
    const event = events?.find(e => e.eventType === node.key);
    return {
      ...node,
      status: nodeStatus,
      description: event?.message || node.getDesc(delivery || {}),
      timestamp: event?.createdAt ? new Date(event.createdAt).toLocaleString() : null,
    };
  });
}

function StatusIcon({ status, icon: Icon }) {
  if (status === 'completed') {
    return (
      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 ring-[5px] ring-white">
        <CheckCircle2 size={18} className="text-emerald-600" />
      </div>
    );
  }
  if (status === 'active') {
    return (
      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0 ring-[5px] ring-white">
        <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 ring-[5px] ring-white">
      <Icon size={18} className="text-slate-300" />
    </div>
  );
}

function Connector({ status }) {
  const done = status === 'completed';
  return <div className={`w-0.5 h-8 mx-auto ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />;
}

export default function DeliveryTimeline({ delivery, events }) {
  const nodes = useMemo(() => buildNodes(delivery, events), [delivery, events]);

  if (!delivery) return null;

  if (delivery.status === 'ISSUE_REPORTED') {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
        <AlertTriangle size={24} className="mx-auto text-red-500" />
        <p className="text-sm font-bold text-red-700 mt-2">Issue Reported</p>
        <p className="text-xs text-red-500 mt-1">This delivery has a reported issue.</p>
      </div>
    );
  }

  return (
    <div>
      {nodes.map((node, i) => (
        <div key={node.key} className="flex gap-3">
          <div className="flex flex-col items-center pt-1">
            <StatusIcon status={node.status} icon={node.icon} />
            {i < nodes.length - 1 && <Connector status={node.status} />}
          </div>
          <div className="flex-1 pb-3 min-w-0">
            <div className={`rounded-xl border p-3.5 ${
              node.status === 'completed' ? 'border-emerald-200 bg-emerald-50/40' :
              node.status === 'active' ? 'border-orange-200 bg-orange-50 shadow-sm' :
              'border-slate-100 bg-white'
            }`}>
              <p className={`text-sm font-bold ${
                node.status === 'pending' ? 'text-slate-400' : 'text-slate-900'
              }`}>{node.title}</p>
              {node.status !== 'pending' && (
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{node.description}</p>
              )}
              {node.status !== 'pending' && node.timestamp && (
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{node.timestamp}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
