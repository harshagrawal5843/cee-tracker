export async function generateStaticParams() {
  return [
    { name: "physics" },
    { name: "chemistry" },
    { name: "zoology" },
    { name: "botany" },
    { name: "mental-ability-test" },
  ];
}

export const metadata = {
  title: "Subject - CEE Tracker",
  description: "Track your progress on this subject",
};

export default function Layout({ children }) {
  return children;
}
