// app/admin/layout.tsx
// Admin-only layout — clean full-width layout with no BottomNav.
// Access is protected by middleware (ADMIN role required).

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
