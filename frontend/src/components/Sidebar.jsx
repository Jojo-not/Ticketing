import React, { useEffect, useState } from "react";
import { Link, useLocation, Navigate, useNavigate } from "react-router-dom";
import { MdMenuOpen } from "react-icons/md";
import { useStateContext } from "../contexts/ContextProvider";
import { getLinks } from "../data/links";
import qtechLogo from "../assets/qtechlogo.png";
import { FaUserCircle } from "react-icons/fa";
import useUser from "../hooks/use-user";
import Swal from "sweetalert2"; // Assumed you're using this

export const Sidebar = () => {
  const {
    activeMenu,
    setActiveMenu,
    screenSize,
    setScreenSize,
    logout,
    login,
    token,
  } = useStateContext();

  const location = useLocation();
  const navigate = useNavigate();
  const user = useUser();
  const [links, setLinks] = useState({});
  const [newTicketsCount, setNewTicketsCount] = useState(0);
  const [active, setActive] = useState("");

  if (!login) {
    return <Navigate to="/" />;
  }

  useEffect(() => {
    if (user) {
      setLinks(getLinks(user.role));
    }
  }, [user]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setScreenSize(width);

      if (width < 1024) {
        setActiveMenu(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setScreenSize]);

  useEffect(() => {
    if (!token || !user?.id) return;

    const fetchTickets = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/allTickets", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch tickets");
        }

        const data = await response.json();
        const readTicketIds = JSON.parse(
          localStorage.getItem("readTicketIds") || "[]"
        );
        const unreadTickets = data.filter(
          (ticket) => !readTicketIds.includes(ticket.id)
        );
        setNewTicketsCount(unreadTickets.length);
      } catch (error) {
        console.error("Error fetching tickets:", error);
      }
    };

    fetchTickets();
  }, [token, user]);

  useEffect(() => {
    const currentPath = location.pathname;
    if (links && links.links) {
      links.links.forEach((link) => {
        if (link.path === currentPath) {
          setActive(link.name);
        }
      });
    }
  }, [location, links]);

  const HandleLogout = async () => {
    const result = await Swal.fire({
      title: "Are you sure to Logout?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0D0630",
      cancelButtonColor: "#d33",
      confirmButtonText: "Continue to Logout!",
    });

    if (result.isConfirmed) {
      await Swal.fire({
        title: "Success!",
        text: "You have been logged out.",
        icon: "success",
      });
      logout();
      navigate("/");
    }
  };

  return (
    <>
      {screenSize < 1024 && !activeMenu && (
        <div className="fixed top-9 lg:top-8 md:top-8 left-5 z-50">
          <MdMenuOpen
            className="text-2xl text-[#08032B] mx-3 rotate-180 cursor-pointer"
            onClick={() => setActiveMenu(true)}
          />
        </div>
      )}

      <div
        className={`fixed top-0 left-0 h-screen bg-[#08032B] text-white z-40 transition-all duration-300 ${
          screenSize < 1024
            ? activeMenu
              ? "w-64"
              : "w-0"
            : activeMenu
            ? "w-72"
            : "w-25"
        } overflow-y-auto`}
      >
        <span
          className={`absolute cursor-pointer top-9.5 right-9 z-50 transition-transform ${
            !activeMenu ? "rotate-180 right-9" : ""
          }`}
          onClick={() => setActiveMenu(!activeMenu)}
        >
          <MdMenuOpen className="text-2xl" />
        </span>

        <div className="p-6 pt-8 flex items-center justify-between">
          <h1
            className={`origin-left font-bold text-2xl transition-all duration-300 cursor-pointer ${
              !activeMenu ? "scale-0" : ""
            }`}
          >
            <img src={qtechLogo} alt="Qtech Logo" className="h-8" />
          </h1>
        </div>

        <div className="mt-2 px-3">
          <div className="mt-0 border-t border-gray-500" />
          {user && (
            <div
              className={`flex flex-col items-center gap-2 mt-15 transition-all duration-300 ${
                activeMenu ? "w-full p-7" : "w-12 p-2 rounded-lg"
              }`}
            >
              <FaUserCircle
                className={`text-gray-300 transition-all duration-300 ${
                  activeMenu ? "text-7xl" : "ml-7 text-3xl"
                }`}
              />
              {activeMenu && (
                <div className="text-md text-center capitalize">
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-gray-400 text-sm capitalize">
                    {user.role}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-500 mt-6" />
        </div>

        {links && (
          <div className="mt-5 px-3">
            <div className="text-sm p-3 space-y-3">
              {activeMenu && links.title && (
                <h3 className="text-gray-400 uppercase text-xs tracking-wider px-4 transition-opacity duration-500">
                  {links.title}
                </h3>
              )}

              {links.links &&
                links.links.map((link) => {
                  const isNotificationLink =
                    link.name.toLowerCase() === "notification";

                  return (
                    <Link
                      to={link.path}
                      key={link.name}
                      onClick={() => {
                        setActive(link.name);
                        if (screenSize < 1024) setActiveMenu(false);
                      }}
                      className={`flex items-center gap-4 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-300 ${
                        active === link.name
                          ? "bg-[#1D4ED8] text-white"
                          : "text-white hover:bg-[#1a1445]"
                      } relative`}
                    >
                      <span className="text-xl">{link.icon}</span>
                      {activeMenu && <span>{link.name}</span>}

                      {isNotificationLink && newTicketsCount > 0 && (
                        <span className="absolute top-2 right-4 flex items-center justify-center min-w-[18px] h-5 px-1 text-xs font-bold text-white bg-red-600 rounded-full select-none">
                          {newTicketsCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
