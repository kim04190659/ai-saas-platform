import { Check, X, AlertCircle, Info, MessageSquare, CheckCircle } from 'lucide-react';
import { Notification } from './NotificationCenter';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'warning':
        return <AlertCircle size={20} className="text-orange-600" />;
      case 'info':
        return <Info size={20} className="text-blue-600" />;
      case 'message':
        return <MessageSquare size={20} className="text-purple-600" />;
      default:
        return <Info size={20} className="text-gray-600" />;
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors ${
        !notification.read ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">{getIcon()}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`text-sm font-semibold ${
                !notification.read ? 'text-gray-900' : 'text-gray-700'
              }`}
            >
              {notification.title}
            </h4>
            {!notification.read && (
              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-600 mt-1.5"></span>
            )}
          </div>

          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {getTimeAgo(notification.timestamp)}
            </span>

            <div className="flex items-center gap-2">
              {!notification.read && (
                <button
                  onClick={() => onMarkAsRead(notification.id)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  title="Mark as read"
                >
                  <Check size={14} />
                  Mark read
                </button>
              )}
              <button
                onClick={() => onDelete(notification.id)}
                className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                title="Delete notification"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
