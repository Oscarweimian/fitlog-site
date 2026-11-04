# FitLog

FitLog is a personal fitness and nutrition journal. The live website is [oscarsfitlog.com](https://oscarsfitlog.com/).

## Features

- Plan each day as strength training, sports, or rest, and record workouts and cardio.
- Log breakfast, lunch, and dinner with a curated food picker and optional calories for a known portion.
- View estimated daily intake, nutrients, exercise burn, and intake minus burn.
- Track drinks and protein powder, and add photos to the gallery.
- Export and restore a JSON backup of your journal.

## Run locally

Install [Node.js](https://nodejs.org/), then run:

```bash
npm ci
npm run dev
```

Open the local address printed by Vite. To check a change before publishing:

```bash
npm test
npm run build
```

## Where records are saved

Journal entries and uploaded photos are stored in your browser's IndexedDB. Each browser, device, and website address has its own records. Use the in-app backup export before clearing browser data or moving to another device.

## Updates and deployment

See the [commit history](https://github.com/Oscarweimian/fitlog-site/commits/main/) for source changes. The repository contains the React/Vite source; the `dist/` build output is generated locally and is not committed. A GitHub push does not by itself publish a new website version—the hosted site is deployed separately through Sites.

---

中文简述：FitLog 用于记录饮食、饮水和训练，并展示估算的摄入与消耗。记录保存在当前浏览器中；换设备或清除浏览器数据前，请先在网站内导出备份。代码更新可在上方的提交历史查看。
