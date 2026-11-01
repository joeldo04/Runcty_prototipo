import path from 'path'
import { buildFigmaConfig } from '@payloadcms/figma'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { en as adminLanguage } from '@payloadcms/translations/languages/en'
import { fileURLToPath } from 'url'
import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Folders } from './collections/Folders'
import { Tags } from './collections/Tags'
import { Users } from './collections/Users'
import { Routes } from './collections/Routes'
import { RoadSegments } from './collections/RoadSegments'
import { Incidents } from './collections/Incidents'
import { Trainings } from './collections/Trainings'
import { Sponsors } from './collections/Sponsors'
import { Banners } from './collections/Banners'
import { Spaces } from './collections/Spaces'
import { RiskZones } from './collections/RiskZones'
import { CommunityComments } from './collections/CommunityComments'
import { ModerationLog } from './collections/ModerationLog'
import { LiveShares } from './collections/LiveShares'
import { SosAlerts } from './collections/SosAlerts'
import { Cities } from './collections/Cities'
import { Club } from './globals/Club'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildFigmaConfig({
  admin: {
    user: Admins.slug,
    constrainWidth: true,
    dashboard: {
      widgets: [],
      defaultLayout: [
        { widgetSlug: 'activity', width: 'full' },
        { widgetSlug: 'collections', width: 'full' },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: { en: adminLanguage },
  },
  collections: [
    Admins,
    Media,
    Folders,
    Tags,
    Users,
    Routes,
    RoadSegments,
    Incidents,
    Trainings,
    Sponsors,
    Banners,
    Spaces,
    RiskZones,
    CommunityComments,
    ModerationLog,
    LiveShares,
    SosAlerts,
    Cities,
  ],
  globals: [Club],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  localization: {
    locales: [{ code: 'en', label: 'English' }],
    fallback: true,
    defaultLocale: 'en',
  },
  plugins: [mcpPlugin({})],
  figma: {},
})
