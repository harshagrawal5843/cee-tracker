# CEE Tracker - NEET Exam Preparation Tracker

A modern, responsive progress tracking application for NEET aspirants to monitor their preparation across Physics, Chemistry, Zoology, and Botany subjects.

## Features

✨ **Modern UI** - Clean, responsive design with dark/light theme support
📊 **Progress Tracking** - Real-time progress calculations for each subject
🎯 **Subject-wise Organization** - Structured data for 4 core NEET subjects
📚 **Chapter Management** - Expandable accordion for lectures and problems
✅ **Task Completion** - Check off lectures and problem sets as completed
💾 **Local Storage** - All progress is saved locally in your browser
⚡ **Fast Performance** - Built with Next.js 14 and optimized components

## Technology Stack

- **Frontend Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Language**: Vanilla JavaScript (ES6+)
- **Persistence**: Browser localStorage
- **Icons**: Unicode Emoji

## Project Structure

```
CEETracker/
├── app/
│   ├── layout.js              # Root layout
│   ├── page.js                # Homepage/Dashboard
│   ├── globals.css            # Global styles
│   ├── not-found.js           # 404 page
│   └── subject/
│       └── [name]/
│           ├── page.js        # Subject detail page
│           └── layout.js      # Subject layout with static params
├── components/
│   ├── ProgressBar.js         # Linear progress bar component
│   ├── CircularProgress.js    # Circular progress indicator
│   ├── SubjectCard.js         # Subject card for dashboard
│   ├── SubjectNavigation.js   # Quick subject switcher
│   └── ChapterAccordion.js    # Expandable chapter section
├── lib/
│   └── storage.js             # localStorage utilities & progress calculations
├── data.js                    # NEET curriculum data
├── package.json               # Dependencies
├── next.config.mjs            # Next.js config
├── tailwind.config.js         # Tailwind configuration
├── postcss.config.mjs         # PostCSS config
├── jsconfig.json              # JS path aliases
└── README.md                  # This file
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Navigate to the project directory:
```bash
cd CEETracker
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
# or
yarn build
yarn start
```

## Data Structure

The curriculum is organized in `data.js` with the following structure:

```javascript
neetData = {
  physics: [
    {
      id: "phy-ch1",
      chapterName: "Chapter Name",
      lectures: [
        {
          id: "phy-ch1-lec1",
          title: "Lecture Title",
          duration: "MM:SS",
          link: "https://..."
        }
      ],
      problems: [
        {
          id: "phy-ch1-prob1",
          title: "Problem Set Title",
          platform: "NCERT/PYQ",
          link: "https://..."
        }
      ]
    }
  ],
  chemistry: [...],
  zoology: [...],
  botany: [...]
}
```

## Storage Schema

All completion data is stored in localStorage under `neet-tracker-completions`:

```javascript
{
  "physics-phy-ch1-lec-phy-ch1-lec1": true,
  "physics-phy-ch1-prob-phy-ch1-prob1": true,
  // ... more entries
}
```

## Key Components

### SubjectCard
Displays a subject with progress bar, percentage, and chapter stats. Located in `components/SubjectCard.js`

### ProgressBar
Linear progress indicator with gradient. Supports different sizes (sm, md, lg). Located in `components/ProgressBar.js`

### CircularProgress
Circular progress indicator with percentage. Located in `components/CircularProgress.js`

### ChapterAccordion
Expandable section showing lectures and problems with checkboxes. Located in `components/ChapterAccordion.js`

### SubjectNavigation
Quick navigation buttons to switch between subjects. Located in `components/SubjectNavigation.js`

## Extending the Application

### Adding More Data

Edit `data.js` to add more chapters, lectures, and problems:

```javascript
{
  id: "phy-ch4",
  chapterName: "New Chapter",
  lectures: [
    {
      id: "phy-ch4-lec1",
      title: "New Lecture",
      duration: "45:30",
      link: "https://youtube.com/..."
    }
  ],
  problems: [
    {
      id: "phy-ch4-prob1",
      title: "New Problem Set",
      platform: "NCERT",
      link: "https://ncert.nic.in/"
    }
  ]
}
```

### Customizing Styles

Tailwind configuration is in `tailwind.config.js`. Modify theme colors and utilities as needed.

### Adding New Subjects

1. Add to `neetSubjects` array in `data.js`
2. Add data to `neetData` object in `data.js`
3. Update `generateStaticParams()` in `app/subject/[name]/layout.js`

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Tips

- Progress calculations are memoized to prevent unnecessary recalculations
- localStorage operations are batched for efficiency
- Dynamic imports and code splitting are handled by Next.js
- Images and static assets are optimized

## Troubleshooting

**Progress not saving?**
- Check browser localStorage is enabled
- Clear cache if issues persist with old data

**Page not loading?**
- Ensure Node.js version is 18+
- Try clearing `node_modules` and reinstalling: `npm install`

**Styling issues?**
- Rebuild Tailwind: `npm run build`
- Clear Next.js cache: `rm -rf .next`

## Future Enhancements

- [ ] Cloud sync for progress across devices
- [ ] Study schedule/timeline feature
- [ ] Notes section for each chapter
- [ ] Mock tests integration
- [ ] Performance analytics & insights
- [ ] Offline PWA support
- [ ] Dark/Light theme toggle UI

## License

Open source - Free to use and modify

## Support

For issues or feature requests, please reach out to the maintainer.

---

**Happy Learning! Good luck with your NEET preparation! 🚀**
