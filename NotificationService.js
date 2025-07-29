// src/services/NotificationService.js
import axios from "axios";
import { EventBus } from "../event-bus";

export async function checkNotifications(parentId, etablissementId, anneeScolaireId) {
  const token = localStorage.getItem("token");

  try {
    const res = await axios.get(
      `http://localhost:8080/api/notificationed/${parentId}/${etablissementId}/${anneeScolaireId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const notifications = res.data.alertMessages || [];
    const total = notifications.filter((msg) => msg.includes("[NOUVELLE]")).length;

    localStorage.setItem("notifications_total", total);
    EventBus.emit("updateBadgeCount", total);
  } catch (error) {
    console.error("Erreur de chargement des notifications :", error);
    localStorage.setItem("notifications_total", 0);
    EventBus.emit("updateBadgeCount", 0);
  }
}
