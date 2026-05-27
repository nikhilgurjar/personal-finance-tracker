'use client';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'teal' | 'orange';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const colorClasses = {
  blue: 'from-blue-500 to-purple-500',
  green: 'from-green-500 to-teal-500',
  red: 'from-red-500 to-orange-500',
  purple: 'from-purple-500 to-pink-500',
  teal: 'from-teal-500 to-teal-700',
  orange: 'from-amber-500 to-orange-600',
};

const sizeClasses = {
  small: 'h-1.5',
  medium: 'h-2',
  large: 'h-3',
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  color = 'blue',
  size = 'medium',
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const isCompleted = percentage >= 100;

  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <p className="font-semibold text-gray-900">{label}</p>}
          {showPercentage && (
            <p
              className={`font-bold text-sm ${
                isCompleted ? 'text-green-600' : 'text-blue-600'
              }`}
            >
              {Math.round(percentage)}%
            </p>
          )}
        </div>
      )}

      <div className={`w-full bg-gray-200 rounded overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`h-full bg-gradient-to-r ${
            isCompleted
              ? 'from-green-500 to-green-700'
              : colorClasses[color]
          } rounded transition-all duration-500 ease-in-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
