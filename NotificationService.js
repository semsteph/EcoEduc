// src/services/NotificationService.js
import axios from "axios";
import { EventBus } from "../event-bus";

/**
 * ✅ Compatible avec la nouvelle API:
 * GET /api/notificationed/:parentId/:etablissementId/:anneeScolaireId
 * -> res.data.notifications = [{..., is_read: 0/1 ou true/false}, ...]
 */
export async function checkNotifications(parentId, etablissementId, anneeScolaireId) {
  // ✅ SSR-safe
  if (typeof window === "undefined") return 0;

  const token = localStorage.getItem("token");

  // sécurité params
  if (!parentId || !etablissementId || !anneeScolaireId) {
    localStorage.setItem("notifications_total", "0");
    localStorage.setItem("notifications_unread", "0");
    EventBus.emit("updateBadgeCount", 0);
    return 0;
  }

  const toBool = (v) => v === true || v === 1 || v === "1";

  try {
    const res = await axios.get(
      `http://localhost:8080/api/notificationed/${parentId}/${etablissementId}/${anneeScolaireId}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );

    // ✅ NOUVELLE API : objets, pas alertMessages
    const notifications = Array.isArray(res.data?.notifications) ? res.data.notifications : [];

    // ✅ unread = is_read == false
    const unread = notifications.filter((n) => !toBool(n.is_read)).length;

    // total = nb notifs du mois renvoyées
    const total = notifications.length;

    localStorage.setItem("notifications_total", String(total));
    localStorage.setItem("notifications_unread", String(unread));

    // Badge = non lues
    EventBus.emit("updateBadgeCount", unread);

    return unread;
  } catch (error) {
    console.error("Erreur de chargement des notifications :", error?.response?.data || error);

    localStorage.setItem("notifications_total", "0");
    localStorage.setItem("notifications_unread", "0");
    EventBus.emit("updateBadgeCount", 0);

    return 0;
  }
}
