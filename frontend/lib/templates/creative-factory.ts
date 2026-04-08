import type { ThemePreset } from "@/types/editor";

export const CREATIVE_FACTORY_THEME_PRESETS: ThemePreset[] = [
  {
    id: "slg_launch",
    label: "SLG Launch",
    description: "High-pressure strategy war ads with rapid escalation and alliance scale.",
    graphName: "Creative Factory · SLG Launch",
    nodeParamOverrides: {
      select_assets_1: { top_n: 2 },
      generate_variants_1: { variantCount: 3 },
      review_variants_1: { scoreThreshold: 7.8 },
    },
    themeConfig: {
      themePreset: "slg_launch",
      domain: "game_ads",
      genre: "SLG",
      market: "US",
      platform: "facebook",
      language: "zh",
      creativeStyle: "high_pressure_growth_loop",
      tone: "urgent",
      languageConstraints: ["ui_en_only"],
      evaluationPolicy: { scoreThreshold: 7.8, hookPriority: "very_high", payoffPriority: "high" },
      assetSourcePolicy: { adLibrary: true, rss: true },
      strategyProfile: {
        hookTheme: "资源危机与战局失控",
        payoffTheme: "联盟推进、战力成长与结果反转",
        visualPattern: "警报色、大地图轨迹、爆字反馈",
        pacingPattern: "前三秒警报切入，中段连续决策，尾段规模反推",
        evaluationFocus: ["前三秒高压钩子", "成长反馈清晰", "联盟规模感"],
      },
    },
  },
  {
    id: "rpg_fantasy",
    label: "RPG Fantasy",
    description: "Hero-led fantasy progression with class fantasy, bosses, and loot payoff.",
    graphName: "Creative Factory · RPG Fantasy",
    nodeParamOverrides: {
      select_assets_1: { top_n: 3 },
      generate_variants_1: { variantCount: 3 },
      review_variants_1: { scoreThreshold: 7.6 },
    },
    themeConfig: {
      themePreset: "rpg_fantasy",
      domain: "game_ads",
      genre: "RPG",
      market: "JP",
      platform: "youtube_shorts",
      language: "zh",
      creativeStyle: "hero_power_fantasy",
      tone: "epic",
      languageConstraints: ["ui_en_only"],
      evaluationPolicy: { scoreThreshold: 7.6, fantasyClarity: "high", rewardVisibility: "high" },
      assetSourcePolicy: { adLibrary: true, rss: false },
      strategyProfile: {
        hookTheme: "英雄觉醒与强敌压境",
        payoffTheme: "职业成长、掉落回报与 Boss 压制",
        visualPattern: "技能爆发、装备光效、Boss 定格",
        pacingPattern: "先压迫后觉醒，再用掉落和 Boss 结果收束",
        evaluationFocus: ["职业幻想清晰", "战斗爆发镜头", "掉落与成长回报"],
      },
    },
  },
  {
    id: "survival_chaos",
    label: "Survival Chaos",
    description: "Overwhelming threat, scrappy resource recovery, and last-second reversals.",
    graphName: "Creative Factory · Survival Chaos",
    nodeParamOverrides: {
      select_assets_1: { top_n: 2 },
      generate_variants_1: { variantCount: 4 },
      review_variants_1: { scoreThreshold: 7.9 },
    },
    themeConfig: {
      themePreset: "survival_chaos",
      domain: "game_ads",
      genre: "Survival",
      market: "US",
      platform: "tiktok",
      language: "zh",
      creativeStyle: "chaotic_resource_panic",
      tone: "grim",
      languageConstraints: ["ui_en_only"],
      evaluationPolicy: { scoreThreshold: 7.9, dangerVisibility: "very_high", scarcityPressure: "high" },
      assetSourcePolicy: { adLibrary: true, rss: true },
      strategyProfile: {
        hookTheme: "资源匮乏与生存崩盘边缘",
        payoffTheme: "极限翻盘、补给回收与据点重建",
        visualPattern: "低资源警报、混乱尸潮、临界反杀",
        pacingPattern: "先资源崩盘，再强压追逐，最后临界反杀",
        evaluationFocus: ["匮乏压迫感", "混乱威胁可见", "最后翻盘够爽"],
      },
    },
  },
];

export function getCreativeFactoryThemePresetById(themePresetId: string): ThemePreset | undefined {
  return CREATIVE_FACTORY_THEME_PRESETS.find((preset) => preset.id === themePresetId);
}
