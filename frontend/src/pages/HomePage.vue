<template>
  <AppShell>
    <section class="page-card">
      <div class="page-card__eyebrow">Home</div>
      <h2 class="page-card__title">GraphiteUI Vue rebuild is running</h2>
      <p class="page-card__body">The React frontend has been replaced on this branch. Next we rebuild the editor workspace, runs view, and settings on top of the current backend.</p>
    </section>
  </AppShell>
</template>

<script setup lang="ts">
import AppShell from "@/layouts/AppShell.vue";
</script>

<style scoped>
.page-card {
  border: 1px solid rgba(154, 52, 18, 0.14);
  border-radius: 24px;
  padding: 24px;
  background: rgba(255, 252, 247, 0.88);
  box-shadow: 0 18px 36px rgba(60, 41, 20, 0.08);
}

.page-card__eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(154, 52, 18, 0.78);
}

.page-card__title {
  margin: 8px 0 10px;
  font-size: 2rem;
}

.page-card__body {
  margin: 0;
  max-width: 60ch;
  line-height: 1.6;
}
</style>
