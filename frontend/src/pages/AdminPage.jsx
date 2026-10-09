import { useState, useEffect } from "react";
import axios from "axios";
import { Check, Trash2, MapPin, Search } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function AdminPage() {
  const [pending, setPending] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    const res = await axios.get(`${API_URL}/pandals/admin/pending`);
    setPending(res.data);
  };

  const handleApprove = async (id) => {
    await axios.put(`${API_URL}/pandals/admin/approve/${id}`);
    fetchPending();
  };

  const handleDelete = async (id, isSearchResult = false) => {
    if (window.confirm("Delete this pandal permanently?")) {
      await axios.delete(`${API_URL}/pandals/admin/delete/${id}`);
      if (isSearchResult) {
        setSearchResults(searchResults.filter((p) => p._id !== id));
      } else {
        fetchPending();
      }
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const res = await axios.get(`${API_URL}/pandals/search?q=${searchQuery}`);
    setSearchResults(res.data);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-black mb-8 text-gray-900">
        Admin Dashboard
      </h1>

      {/* SECTION 1: Pending Queue */}
      <div className="mb-12">
        <h2 className="text-lg font-bold mb-4 text-gray-700 border-b pb-2">
          Pending Submissions
        </h2>
        {pending.length === 0 ? (
          <p className="text-gray-500 italic">
            No pending submissions. Queue is clean!
          </p>
        ) : (
          <div className="grid gap-4">
            {pending.map((pandal) => (
              <div
                key={pandal._id}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center"
              >
                <div>
                  <h3 className="font-bold text-lg">{pandal.name}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin size={12} />{" "}
                    {pandal.location.coordinates[1].toFixed(5)},{" "}
                    {pandal.location.coordinates[0].toFixed(5)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(pandal._id, false)}
                    className="p-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button
                    onClick={() => handleApprove(pandal._id)}
                    className="p-3 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"
                  >
                    <Check size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Search & Destroy (Database Management) */}
      <div>
        <h2 className="text-lg font-bold mb-4 text-gray-700 border-b pb-2">
          Search Live Database
        </h2>
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a live pandal (e.g., xzx)"
            className="flex-1 p-3 rounded-xl border border-gray-300 outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 rounded-xl hover:bg-blue-700 flex items-center gap-2"
          >
            <Search size={18} /> Search
          </button>
        </form>

        <div className="grid gap-3">
          {searchResults.map((pandal) => (
            <div
              key={pandal._id}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center"
            >
              <div>
                <h3 className="font-bold">{pandal.name}</h3>
                <p className="text-xs text-gray-500">{pandal.area}</p>
              </div>
              <button
                onClick={() => handleDelete(pandal._id, true)}
                className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100"
              >
                <Trash2 size={18} /> Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
