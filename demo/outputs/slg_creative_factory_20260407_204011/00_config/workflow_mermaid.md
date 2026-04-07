---
config:
  flowchart:
    curve: linear
---
graph TD;
	__start__([<p>__start__</p>]):::first
	fetch_rss(fetch_rss)
	clean_news(clean_news)
	fetch_ads(fetch_ads)
	normalize_inputs(normalize_inputs)
	select_top_videos(select_top_videos)
	analyze_videos(analyze_videos)
	extract_patterns(extract_patterns)
	news_context(news_context)
	build_brief(build_brief)
	generate_variants(generate_variants)
	generate_storyboards(generate_storyboards)
	generate_video_prompts(generate_video_prompts)
	review_variants(review_variants)
	todo_image_generation(todo_image_generation)
	todo_video_generation(todo_video_generation)
	finalize(finalize)
	__end__([<p>__end__</p>]):::last
	__start__ --> fetch_rss;
	analyze_videos --> extract_patterns;
	build_brief --> generate_variants;
	clean_news --> fetch_ads;
	extract_patterns --> news_context;
	fetch_ads --> normalize_inputs;
	fetch_rss --> clean_news;
	generate_storyboards --> generate_video_prompts;
	generate_variants --> generate_storyboards;
	generate_video_prompts --> review_variants;
	news_context --> build_brief;
	normalize_inputs --> select_top_videos;
	review_variants -. &nbsp;generate&nbsp; .-> generate_variants;
	review_variants -. &nbsp;todo_image&nbsp; .-> todo_image_generation;
	select_top_videos --> analyze_videos;
	todo_image_generation --> todo_video_generation;
	todo_video_generation --> finalize;
	finalize --> __end__;
	classDef default fill:#f2f0ff,line-height:1.2
	classDef first fill-opacity:0
	classDef last fill:#bfb6fc
