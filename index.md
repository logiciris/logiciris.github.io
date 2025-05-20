---
layout: home
title: logiciris blog
permalink: /
---

👋 안녕하세요. logiciris입니다.

---

## 📌 최근 포스트

<ul>
  {% for post in site.posts limit:5 %}
    <li>
      <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      <span style="font-size: 0.8em; color: gray;">({{ post.date | date: "%Y-%m-%d" }})</span>
    </li>
  {% endfor %}
</ul>
