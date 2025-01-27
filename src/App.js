import AdminRoleManager from './components/AdminRoleManager';

function App() {
  return (
    <Routes>
      <Route path="/admin/roles" element={<AdminRoleManager />} />
    </Routes>
  )
} 