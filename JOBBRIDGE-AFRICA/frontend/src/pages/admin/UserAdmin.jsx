import { useState, useEffect } from "react";
import api from "../../services/api";

const UserAdmin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setError("");
    setSuccess("");
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      setSuccess("User role updated");
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update role");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      {error && <div className="bg-red-100 text-red-700 p-2 mb-4">{error}</div>}
      {success && (
        <div className="bg-green-100 text-green-700 p-2 mb-4">{success}</div>
      )}
      {loading ? (
        <div>Loading users...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 border">Name</th>
                <th className="px-4 py-2 border">Email</th>
                <th className="px-4 py-2 border">Role</th>
                <th className="px-4 py-2 border">Created</th>
                <th className="px-4 py-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="px-4 py-2 border">{user.name}</td>
                  <td className="px-4 py-2 border">{user.email}</td>
                  <td className="px-4 py-2 border">{user.role}</td>
                  <td className="px-4 py-2 border">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 border">
                    {user.role !== "admin" && (
                      <button
                        className="bg-blue-600 text-white px-3 py-1 rounded mr-2"
                        onClick={() => handleRoleChange(user._id, "admin")}
                      >
                        Promote to Admin
                      </button>
                    )}
                    {user.role === "admin" && (
                      <button
                        className="bg-gray-500 text-white px-3 py-1 rounded"
                        onClick={() => handleRoleChange(user._id, "job_seeker")}
                        disabled={user.email === "info@jobbridgeafrica.org"}
                      >
                        Demote to User
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserAdmin;
