export function Badge({ children, variant = 'default', size = 'sm' }) {
  const variantStyles = {
    high: 'badge-danger',
    medium: 'badge-warning',
    low: 'badge-info',
    success: 'badge-success',
    default: 'badge-neutral',
    purple: 'badge-purple',
    exam: 'badge-purple',
    assignment: 'badge-info',
    review: 'badge-success',
    break: 'badge-neutral',
  };

  const className = `badge ${variantStyles[String(variant).toLowerCase()] || 'badge-neutral'} ${
    size === 'xs' ? 'badge-xs' : ''
  }`;

  return <span className={className}>{children}</span>;
}
