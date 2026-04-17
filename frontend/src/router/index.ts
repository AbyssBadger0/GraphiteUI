import { createRouter, createWebHistory } from "vue-router";

import EditorPage from "@/pages/EditorPage.vue";
import HomePage from "@/pages/HomePage.vue";
import RunsPage from "@/pages/RunsPage.vue";
import SettingsPage from "@/pages/SettingsPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: HomePage },
    { path: "/editor", component: EditorPage },
    { path: "/editor/new", component: EditorPage },
    { path: "/runs", component: RunsPage },
    { path: "/settings", component: SettingsPage },
  ],
});
