import React from "react";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Simple and highly effective custom markdown parser
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let inList = false;
    let listItems: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushList = (key: string) => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${key}`} className="list-disc pl-5 my-3 space-y-1.5 text-slate-700 text-sm">
            {listItems.map((item, idx) => (
              <li key={`li-${key}-${idx}`}>{renderInline(item)}</li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    const flushTable = (key: string) => {
      if (tableRows.length > 0) {
        const headers = tableRows[0];
        const dataRows = tableRows.slice(1);

        // Filter out separator lines (e.g. |---|)
        const cleanRows = dataRows.filter(row => !row.every(cell => cell.trim().match(/^:?-+:?$/)));

        elements.push(
          <div key={`table-container-${key}`} className="overflow-x-auto my-4 rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold">
                <tr>
                  {headers.map((cell, idx) => (
                    <th key={`th-${key}-${idx}`} className="px-4 py-3 font-semibold text-slate-800">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                {cleanRows.map((row, rowIdx) => (
                  <tr key={`tr-${key}-${rowIdx}`} className="hover:bg-slate-50/50 transition-colors">
                    {row.map((cell, cellIdx) => (
                      <td key={`td-${key}-${rowIdx}-${cellIdx}`} className="px-4 py-3 font-medium text-slate-700">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    };

    const renderInline = (str: string): React.ReactNode => {
      const parts: React.ReactNode[] = [];
      let i = 0;
      let keyCounter = 0;

      // Match strong/em or code tags
      while (i < str.length) {
        // Strong `**`
        if (str.startsWith("**", i)) {
          const end = str.indexOf("**", i + 2);
          if (end !== -1) {
            parts.push(<strong key={keyCounter++} className="font-bold text-slate-900">{str.substring(i + 2, end)}</strong>);
            i = end + 2;
            continue;
          }
        }
        // Italic `*`
        if (str.startsWith("*", i) && !str.startsWith("**", i)) {
          const end = str.indexOf("*", i + 1);
          if (end !== -1) {
            parts.push(<em key={keyCounter++} className="italic text-slate-800">{str.substring(i + 1, end)}</em>);
            i = end + 1;
            continue;
          }
        }
        // Inline code `` ` ``
        if (str.startsWith("`", i)) {
          const end = str.indexOf("`", i + 1);
          if (end !== -1) {
            parts.push(
              <code key={keyCounter++} className="bg-slate-100 text-violet-700 px-1.5 py-0.5 rounded font-mono text-[13px] font-semibold border border-slate-200">
                {str.substring(i + 1, end)}
              </code>
            );
            i = end + 1;
            continue;
          }
        }

        // Just regular character
        parts.push(str[i]);
        i++;
      }
      return parts;
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      const key = `${idx}`;

      // Handle Table Rows (line starts and ends with |)
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        flushList(key);
        inTable = true;
        const cells = trimmed
          .split("|")
          .map(cell => cell.trim())
          .slice(1, -1); // remove empty first and last cells
        tableRows.push(cells);
        return;
      } else {
        if (inTable) flushTable(key);
      }

      // Handle Bullets
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        flushList(key);
        inList = true;
        listItems.push(trimmed.substring(2));
        return;
      } else {
        if (inList && !trimmed.startsWith("- ") && !trimmed.startsWith("* ")) {
          flushList(key);
        }
      }

      // Headings
      if (trimmed.startsWith("### ")) {
        elements.push(
          <h3 key={key} className="text-base font-bold text-slate-800 mt-5 mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
            <span className="w-1.5 h-3.5 bg-violet-600 rounded-full inline-block"></span>
            {renderInline(trimmed.substring(4))}
          </h3>
        );
        return;
      }
      if (trimmed.startsWith("#### ")) {
        elements.push(
          <h4 key={key} className="text-sm font-bold text-slate-700 mt-4 mb-1.5">
            {renderInline(trimmed.substring(5))}
          </h4>
        );
        return;
      }
      if (trimmed.startsWith("## ")) {
        elements.push(
          <h2 key={key} className="text-lg font-bold text-slate-900 mt-6 mb-3 border-b-2 border-slate-100 pb-1 flex items-center gap-2">
            {renderInline(trimmed.substring(3))}
          </h2>
        );
        return;
      }
      if (trimmed.startsWith("# ")) {
        elements.push(
          <h1 key={key} className="text-xl font-extrabold text-slate-900 mt-7 mb-4 tracking-tight border-b-4 border-violet-100 pb-2">
            {renderInline(trimmed.substring(2))}
          </h1>
        );
        return;
      }

      // Alert / Blockquotes (> [!NOTE], etc.)
      if (trimmed.startsWith(">")) {
        const blockText = trimmed.replace(/^>\s*/, "");
        let alertType: "note" | "tip" | "important" | "warning" | "caution" | "plain" = "plain";
        let displayContent = blockText;

        if (blockText.startsWith("[!NOTE]")) {
          alertType = "note";
          displayContent = blockText.replace("[!NOTE]", "").trim();
        } else if (blockText.startsWith("[!TIP]")) {
          alertType = "tip";
          displayContent = blockText.replace("[!TIP]", "").trim();
        } else if (blockText.startsWith("[!IMPORTANT]")) {
          alertType = "important";
          displayContent = blockText.replace("[!IMPORTANT]", "").trim();
        } else if (blockText.startsWith("[!WARNING]")) {
          alertType = "warning";
          displayContent = blockText.replace("[!WARNING]", "").trim();
        } else if (blockText.startsWith("[!CAUTION]")) {
          alertType = "caution";
          displayContent = blockText.replace("[!CAUTION]", "").trim();
        }

        const alertStyles = {
          note: "bg-blue-50/70 text-blue-800 border-blue-200 border-l-4",
          tip: "bg-emerald-50/70 text-emerald-800 border-emerald-200 border-l-4",
          important: "bg-violet-50/70 text-violet-800 border-violet-200 border-l-4",
          warning: "bg-amber-50/70 text-amber-800 border-amber-200 border-l-4",
          caution: "bg-red-50/70 text-red-800 border-red-200 border-l-4",
          plain: "bg-slate-50 text-slate-700 border-slate-200 border-l-2 pl-3"
        };

        const titleText = {
          note: "ℹ️ 참고사항",
          tip: "💡 권장 팁",
          important: "🔔 중요 고지",
          warning: "⚠️ 경고 및 주의",
          caution: "🚨 고위험 고지",
          plain: ""
        };

        elements.push(
          <div key={key} className={`p-4 rounded-r-xl my-3 text-xs leading-relaxed ${alertStyles[alertType]}`}>
            {titleText[alertType] && (
              <div className="font-bold mb-1 uppercase tracking-wider text-[10px]">
                {titleText[alertType]}
              </div>
            )}
            <div>{renderInline(displayContent)}</div>
          </div>
        );
        return;
      }

      // Horizontal Rule
      if (trimmed === "---") {
        elements.push(<hr key={key} className="my-6 border-t-2 border-slate-100" />);
        return;
      }

      // Normal paragraph
      if (trimmed !== "") {
        elements.push(
          <p key={key} className="text-slate-600 text-sm leading-relaxed my-2">
            {renderInline(line)}
          </p>
        );
      }
    });

    // Flush any remaining active tables/lists
    flushList("final");
    flushTable("final");

    return elements;
  };

  return <div className="space-y-1 font-sans">{renderMarkdown(content)}</div>;
}
