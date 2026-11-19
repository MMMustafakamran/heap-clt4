import { useComponent } from "@copilotkit/react-native/headless";
import { CopilotChat } from "@copilotkit/react-native/components";
import { BarChart, barChartPropsSchema } from "./BarChart";

export function ChatScreen() {
  useComponent({
    name: "render_bar_chart",
    description: "Show numeric data as a bar chart.",
    parameters: barChartPropsSchema,
    render: BarChart,
  });

  return <CopilotChat />;
}
