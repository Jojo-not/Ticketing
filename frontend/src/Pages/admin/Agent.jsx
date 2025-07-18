import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Navigate } from "react-router-dom";
import { MdOutlineSearch, MdFilterList } from "react-icons/md";
import { AiOutlinePlus } from "react-icons/ai";
import toast from "react-hot-toast";
import { useStateContext } from "../../contexts/ContextProvider";
import Layout from "../../layout/Layout";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

export const Agent = () => {
  const { activeMenu, user, login, token } = useStateContext();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [allAgents, setAllAgents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { setValue } = useForm();

  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = localStorage.getItem("agentsCurrentPage");
    return savedPage ? parseInt(savedPage) : 1;
  });
  const itemsPerPage = 5;

  useEffect(() => {
    localStorage.setItem("agentsCurrentPage", currentPage);
  }, [currentPage]);
  useEffect(() => {
    return () => {
      localStorage.removeItem("agentsCurrentPage");
    };
  }, []);

  const addAgentSchema = yup.object().shape({
    name: yup.string().required("Full Name is required."),
    email: yup
      .string()
      .email("Enter a valid email.")
      .required("Email is required."),
    category: yup.string().required("Category is required."),
    password: yup
      .string()
      .min(8, "Password must be at least 8 characters.")
      .required("Password is required."),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref("password")], "Passwords do not match.")
      .required("Please confirm your password."),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(addAgentSchema),
  });

  if (!login && !user?.id) return <Navigate to="/" />;

  useEffect(() => {
    async function fetchAgents() {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:8000/api/agents", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch agents");
        const data = await res.json();

        if (data && Array.isArray(data.agents)) {
          setAllAgents(data.agents);
        } else {
          console.error("Unexpected response shape:", data);
          setAllAgents([]);
        }
      } catch (err) {
        console.error(err);
        setAllAgents([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, [token]);

  const filteredData = allAgents.filter((a) =>
    [a.name, a.email, a.category].some((field) =>
      field.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const onSubmit = async (formData) => {
    setIsAdding(true);
    try {
      const res = await fetch("http://localhost:8000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          role: "agent",
          password_confirmation: formData.confirmPassword,
        }),
      });
      const payload = await res.json();

      if (!res.ok) {
        if (payload.errors) {
          Object.entries(payload.errors).forEach(([field, msgs]) =>
            setError(field, { type: "server", message: msgs.join(" ") })
          );
        }
        throw new Error("Validation failed");
      }

      const newAgent = payload.agent || payload.user || payload;
      setAllAgents((prev) => [...prev, newAgent]);
      toast.success(`${newAgent.name} has been added successfully!`);
      reset();
      setIsAddModalOpen(false);
    } catch (err) {
      toast.error("Error add agent:", err);
      toast.error("Failed to add agent.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleAgentClick = (agent) => {
    setSelectedAgent(agent);
    setIsActionModalOpen(true);
  };

  const handleDeleteAgent = async () => {
    setIsDeleting(true);
    if (!selectedAgent) return;

    try {
      const res = await fetch(
        `http://localhost:8000/api/agents/${selectedAgent.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Failed to delete agent");

      setAllAgents((prev) => prev.filter((a) => a.id !== selectedAgent.id));
      toast.success(`${selectedAgent.name} has been deleted successfully!`);
      setIsActionModalOpen(false);
      setSelectedAgent(null);
    } catch (err) {
      console.error("Error deleting agent:", err);
      toast.error("Failed to delete agent.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditAgent = () => {
    if (!selectedAgent) return;
    setValue("name", selectedAgent.name);
    setValue("email", selectedAgent.email);
    setValue("category", selectedAgent.category);
    setIsActionModalOpen(false);
    setIsEditModalOpen(true);
  };

  const submitEdit = async (formData) => {
    setIsEdit(true);
    if (!selectedAgent) return;

    try {
      const res = await fetch(
        `http://localhost:8000/api/agents/${selectedAgent.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!res.ok) throw new Error("Failed to edit agent");

      const result = await res.json(); // just a message perhaps

      setAllAgents((prev) =>
        prev.map((agent) =>
          agent.id === selectedAgent.id ? { ...agent, ...formData } : agent
        )
      );

      toast.success(`${formData.name} has been updated successfully!`);
      setIsEditModalOpen(false);
      setSelectedAgent(null);
      reset();
    } catch (err) {
      console.error("Error updating agent:", err);
      toast.error("Failed to edit agent.");
    } finally {
      setIsEdit(false);
    }
  };

  const indexOfLastRow = currentPage * itemsPerPage;
  const indexOfFirstRow = indexOfLastRow - itemsPerPage;
  const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const maxVisiblePages = 2;
  const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  const adjustedStartPage = Math.max(
    1,
    Math.min(startPage, totalPages - maxVisiblePages + 1)
  );
  const visiblePages = [];
  for (
    let i = adjustedStartPage;
    i <= Math.min(adjustedStartPage + maxVisiblePages - 1, totalPages);
    i++
  ) {
    visiblePages.push(i);
  }

  return (
    <Layout>
      <div
        className={` transition-all ${activeMenu ? "lg:pl-72" : "lg:pl-23"}`}
      >
        <div className="container mx-auto px-8 py-6">
          <div className="text-3xl font-bold text-[#1D4ED8] mb-1">Agents</div>
          <div className="text-sm font-semibold text-gray-500">
            Manage agent accounts
          </div>
          <div className="max-w mt-7 p-8 bg-white shadow-sm rounded-xl min-h-[430px]">
            <div className="mb-3 text-md font-semibold text-gray-500">
              Agent List
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                <AiOutlinePlus className="text-sm mr-2" /> Add Agent
              </button>
            </div>

            <>
              <div className="mt-3 hidden md:grid grid-cols-[repeat(3,_1fr)] text-center font-semibold text-gray-600 text-sm py-2 mb-5">
                <div>Name</div>
                <div>Email</div>
                <div>Category</div>
              </div>

              <div className="space-y-0.5">
                {loading ? (
                  <div className="col-span-full p-6 text-center text-gray-500 flex flex-row items-center justify-center gap-3">
                    <svg
                      aria-hidden="true"
                      className="animate-spin h-10 w-10 text-gray-200 fill-blue-600"
                      viewBox="0 0 100 101"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M100 50.5C100 78.3 77.6 100.5 50 
      100.5C22.4 100.5 0 78.3 0 50.5C0 22.7 
      22.4 0.5 50 0.5C77.6 0.5 100 22.7 100 
      50.5ZM9.1 50.5C9.1 73.5 27 91.4 50 
      91.4C73 91.4 90.9 73.5 90.9 50.5C90.9 
      27.5 73 9.6 50 9.6C27 9.6 9.1 27.5 9.1 
      50.5Z"
                        fill="currentColor"
                      />
                      <path
                        d="M93.9 39.0C96.8 38.3 98.5 35.2 
      97.4 32.4C95.5 27.7 92.9 23.3 
      89.5 19.4C85.5 14.9 80.6 11.3 
      75.1 8.8C69.6 6.3 63.6 5 57.5 
      5C54.4 5 52 7.4 52 10.5C52 13.6 
      54.4 16 57.5 16C61.8 16 66 16.9 
      69.8 18.7C73.6 20.5 77 23.1 79.7 
      26.4C81.8 28.9 83.5 31.8 84.7 
      35C85.7 37.8 91.1 39.7 93.9 39Z"
                        fill="currentFill"
                      />
                    </svg>
                    <span>Loading Agents...</span>
                  </div>
                ) : filteredData.length > 0 ? (
                  currentRows.map((agent, i) => (
                    <div
                      key={i}
                      className="bg-[#FAFAFA] rounded-lg text-sm text-gray-700 py-3  
                      cursor-pointer hover:bg-[#f5f5f5] transition
              grid md:grid-cols-[repeat(3,_1fr)] items-center gap-2"
                      onClick={() => handleAgentClick(agent)}
                    >
                      <div className="hidden md:block truncate text-center">
                        {agent.name}
                      </div>
                      <div className="hidden md:block truncate text-center">
                        {agent.email}
                      </div>
                      <div className="hidden md:block truncate text-center">
                        {agent.category}
                      </div>

                      <div className="md:hidden space-y-2">
                        <div>
                          <span className="font-semibold">Name:</span>{" "}
                          {agent.name}
                        </div>
                        <div>
                          <span className="font-semibold">Email:</span>{" "}
                          {agent.email}
                        </div>
                        <div>
                          <span className="font-semibold">Category:</span>{" "}
                          {agent.category}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-red-500">
                    No agents found
                  </div>
                )}
              </div>

              {/* Pages */}
            </>
          </div>
          {filteredData.length >= 3 && (
            <div className="flex justify-end gap-2 mt-6">
              <button
                disabled={currentPage === 1}
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => {
                    setCurrentPage((prev) => prev - 1);
                    setLoading(false);
                  }, 500); // simulate delay or wait for fetch to finish
                }}
                className={`px-3 py-1 rounded-sm text-sm ${
                  currentPage === 1
                    ? "bg-white border border-0.5 border-gray-200 cursor-not-allowed"
                    : "bg-white border border-0.5 border-gray-200 hover:bg-gray-50  cursor-pointer"
                }`}
              >
                Previous
              </button>

              {visiblePages.map((page) => (
                <button
                  key={page}
                  disabled={currentPage}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded-sm text-sm ${
                    page === currentPage
                      ? "bg-blue-600 text-white font-bold"
                      : "bg-white"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => {
                    setCurrentPage((prev) => prev + 1);
                    setLoading(false);
                  }, 500);
                }}
                className={`px-3 py-1 rounded-sm text-sm ${
                  currentPage === totalPages
                    ? "bg-white border border-0.5 border-gray-200 cursor-not-allowed"
                    : "bg-white border border-0.5 border-gray-200 hover:bg-gray-50  cursor-pointer"
                }`}
              >
                Next
              </button>
            </div>
          )}

          {/* Add Agent Modal */}
          {isAddModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-black opacity-50" />
              <div className="relative bg-white rounded-xl shadow-sm w-full max-w-lg p-9">
                <h2 className="text-xl font-semibold mb-4">Add New Agent</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Form fields */}
                  <input
                    {...register("name")}
                    className="appearance-none w-full px-3 py-2 border border-gray-600 rounded-lg text-sm 
                    focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Full Name"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs">
                      {errors.name.message}
                    </p>
                  )}

                  <input
                    {...register("email")}
                    className="appearance-none w-full px-3 py-2 border border-gray-600 rounded-lg text-sm 
                    focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Email"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs ">
                      {errors.email.message}
                    </p>
                  )}

                  <select
                    {...register("category")}
                    className="appearance-none w-full px-3 py-2 border border-gray-600 rounded-lg text-sm 
                    focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Choose Type
                    </option>
                    <option>QTech Inventory Support System</option>
                    <option>QTech Utility Billing System</option>
                    <option>
                      Philippine HR, Payroll and Time Keeping System
                    </option>
                    <option>POS for Retail and F&B</option>
                    <option>QSA (Quick and Single Accounting)</option>
                  </select>
                  {errors.category && (
                    <p className="text-red-500 text-xs">
                      {errors.category.message}
                    </p>
                  )}

                  <input
                    {...register("password")}
                    type="password"
                    className="appearance-none w-full px-3 py-2 border border-gray-600 rounded-lg text-sm 
                    focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Password"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-xs">
                      {errors.password.message}
                    </p>
                  )}

                  <input
                    {...register("confirmPassword")}
                    type="password"
                    className="appearance-none w-full px-3 py-2 border border-gray-600 rounded-lg text-sm 
                    focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Confirm Password"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs">
                      {errors.confirmPassword.message}
                    </p>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      type="submit"
                      disabled={isAdding}
                      className={`px-4 py-2 text-white rounded-lg cursor-pointer ${
                        isAdding
                          ? "bg-blue-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {isAdding ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        reset();
                        setIsAddModalOpen(false);
                      }}
                      className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Manage Agent Modal */}
          {isActionModalOpen && selectedAgent && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div
                className="absolute inset-0 bg-black opacity-50"
                onClick={() => setIsActionModalOpen(false)}
              />
              <div className="relative bg-white rounded-xl shadow-sm w-full max-w-lg p-9">
                <h2 className="text-xl font-semibold mb-4">Manage Agent</h2>
                <p className="mb-6 text-gray-700">
                  What would you like to do with{" "}
                  <strong>{selectedAgent.name}</strong>?
                </p>
                <div className="flex justify-between gap-4">
                  <button
                    onClick={handleEditAgent}
                    className="w-full py-2 bg-blue-400 hover:bg-blue-500 text-white rounded-lg cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setIsConfirmOpen(true)}
                    className={`w-full py-2 text-white rounded-lg cursor-pointer ${
                      isDeleting
                        ? "bg-red-500 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>

                <button
                  onClick={() => setIsActionModalOpen(false)}
                  className="mt-4 w-full py-2 bg-gray-200 hover:bg-gray-300 text-black rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isConfirmOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-black opacity-50" />
              <div className="relative bg-white rounded-xl shadow-sm w-full max-w-lg p-9">
                <h2 className="text-xl font-semibold mb-4">Confirm Deletion</h2>
                <p className="mb-6">Do you really want to delete this agent?</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => {
                      handleDeleteAgent();
                      setIsConfirmOpen(false);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setIsConfirmOpen(false)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Agent Modal */}
          {isEditModalOpen && selectedAgent && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-black opacity-50" />
              <div className="relative bg-white rounded-xl shadow-sm w-full max-w-lg p-9">
                <h2 className="text-xl font-semibold mb-4">Edit Agent</h2>
                <form onSubmit={handleSubmit(submitEdit)} className="space-y-4">
                  <input
                    {...register("name", { required: "Name required" })}
                    className="w-full border text-sm p-2 rounded-lg"
                    placeholder="Full Name"
                  />
                  <input
                    {...register("email", { required: "Email required" })}
                    className="w-full border text-sm  p-2 rounded-lg"
                    placeholder="Email"
                  />
                  <select
                    {...register("category", { required: "Category required" })}
                    className="w-full border text-sm p-2 rounded-lg"
                  >
                    <option>QTech Inventory Support System</option>
                    <option>QTech Utility Billing System</option>
                    <option>
                      Philippine HR, Payroll and Time Keeping System
                    </option>
                    <option>POS for Retail and F&B</option>
                    <option>QSA (Quick and Single Accounting)</option>
                  </select>

                  <div className="flex justify-end gap-3">
                    <button
                      type="submit"
                      className={`px-4 py-2 text-white rounded-lg cursor-pointer ${
                        isEdit
                          ? "bg-blue-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {isEdit ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        reset();
                        setIsEditModalOpen(false);
                      }}
                      className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Agent;
