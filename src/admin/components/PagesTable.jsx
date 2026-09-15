const pages = [
  {
    page: "360 View",
    views: "2,340",
    users: "1,842",
    time: "2m 41s",
    rate: "78.4%",
  },
  {
    page: "Amenities",
    views: "1,820",
    users: "1,504",
    time: "1m 52s",
    rate: "72.1%",
  },
  {
    page: "Floor Plan",
    views: "1,240",
    users: "1,102",
    time: "1m 37s",
    rate: "69.8%",
  },
  {
    page: "Location",
    views: "980",
    users: "821",
    time: "58s",
    rate: "61.2%",
  },
  {
    page: "Contact",
    views: "520",
    users: "481",
    time: "46s",
    rate: "54.8%",
  },
];

function PagesTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">

      <div className="border-b border-white/[0.07] p-5 lg:p-6">
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">
          Content
        </p>

        <h2 className="mt-2 text-lg font-medium">
          Most visited pages
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left">
          <thead>
            <tr className="border-b border-white/[0.05] text-[9px] uppercase tracking-[0.2em] text-white/25">
              <th className="px-6 py-4 font-normal">
                Page
              </th>

              <th className="px-6 py-4 font-normal">
                Views
              </th>

              <th className="px-6 py-4 font-normal">
                Users
              </th>

              <th className="px-6 py-4 font-normal">
                Avg. engagement
              </th>

              <th className="px-6 py-4 font-normal">
                Engagement
              </th>
            </tr>
          </thead>

          <tbody>
            {pages.map((page) => (
              <tr
                key={page.page}
                className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-6 py-4 text-sm text-white/80">
                  {page.page}
                </td>

                <td className="px-6 py-4 text-sm text-white/50">
                  {page.views}
                </td>

                <td className="px-6 py-4 text-sm text-white/50">
                  {page.users}
                </td>

                <td className="px-6 py-4 text-sm text-white/50">
                  {page.time}
                </td>

                <td className="px-6 py-4 text-sm text-white/50">
                  {page.rate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PagesTable;