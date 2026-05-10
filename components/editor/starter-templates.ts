import { NODE_TYPES, EDGE_TYPES, NODE_COLORS } from "@/types/canvas"
import type { CanvasNode, CanvasEdge, NodeShape } from "@/types/canvas"

export interface CanvasTemplate {
  id: string
  name: string
  description: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

const SHAPE_DIMS: Record<NodeShape, [number, number]> = {
  rectangle: [160, 80],
  diamond:   [140, 140],
  circle:    [100, 100],
  pill:      [160, 60],
  cylinder:  [100, 120],
  hexagon:   [120, 120],
}

function n(
  id: string,
  label: string,
  shape: NodeShape,
  colorIdx: number,
  x: number,
  y: number,
  w?: number,
  h?: number,
): CanvasNode {
  const [dw, dh] = SHAPE_DIMS[shape]
  return {
    id,
    type: NODE_TYPES.canvasNode,
    position: { x, y },
    data: { label, color: NODE_COLORS[colorIdx].fill, shape },
    width: w ?? dw,
    height: h ?? dh,
  }
}

function e(id: string, source: string, target: string, label?: string): CanvasEdge {
  return {
    id,
    type: EDGE_TYPES.canvasEdge,
    source,
    target,
    data: label ? { label } : {},
  }
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "microservices",
    name: "Microservices Architecture",
    description: "API gateway routing requests to independent backend services with a shared message bus.",
    nodes: [
      n("ms-client",    "Client",          "rectangle", 0, 210,   0),
      n("ms-gateway",   "API Gateway",     "pill",      1, 180, 120),
      n("ms-auth",      "Auth Service",    "rectangle", 2,   0, 270),
      n("ms-users",     "User Service",    "rectangle", 1, 190, 270),
      n("ms-orders",    "Order Service",   "rectangle", 3, 380, 270),
      n("ms-products",  "Product Service", "rectangle", 6, 570, 270),
      n("ms-db-users",  "Users DB",        "cylinder",  1, 190, 430),
      n("ms-db-orders", "Orders DB",       "cylinder",  3, 380, 430),
      n("ms-db-prods",  "Products DB",     "cylinder",  6, 570, 430),
      n("ms-bus",       "Message Bus",     "hexagon",   7, 255, 590),
    ],
    edges: [
      e("ms-e1",  "ms-client",   "ms-gateway"),
      e("ms-e2",  "ms-gateway",  "ms-auth"),
      e("ms-e3",  "ms-gateway",  "ms-users"),
      e("ms-e4",  "ms-gateway",  "ms-orders"),
      e("ms-e5",  "ms-gateway",  "ms-products"),
      e("ms-e6",  "ms-users",    "ms-db-users"),
      e("ms-e7",  "ms-orders",   "ms-db-orders"),
      e("ms-e8",  "ms-products", "ms-db-prods"),
      e("ms-e9",  "ms-orders",   "ms-bus"),
      e("ms-e10", "ms-products", "ms-bus"),
    ],
  },
  {
    id: "cicd",
    name: "CI/CD Pipeline",
    description: "Automated pipeline from code commit through test, build, and deploy stages.",
    nodes: [
      n("ci-repo",    "Git Repo",       "cylinder",  1,    0,  30),
      n("ci-trigger", "Push / PR",      "diamond",   0,  200,   0, 120, 120),
      n("ci-lint",    "Lint & Format",  "rectangle", 0,  420,   0),
      n("ci-test",    "Unit Tests",     "rectangle", 6,  420, 130),
      n("ci-build",   "Build Image",    "rectangle", 3,  640,  65),
      n("ci-scan",    "Security Scan",  "rectangle", 4,  640, 185),
      n("ci-stage",   "Deploy Staging", "pill",      7,  860,  20),
      n("ci-e2e",     "E2E Tests",      "rectangle", 6,  860, 140),
      n("ci-approve", "Manual Approve", "diamond",   5,  860, 290, 130, 120),
      n("ci-prod",    "Deploy Prod",    "pill",      2, 1080, 165),
    ],
    edges: [
      e("ci-e1",  "ci-repo",    "ci-trigger"),
      e("ci-e2",  "ci-trigger", "ci-lint"),
      e("ci-e3",  "ci-trigger", "ci-test"),
      e("ci-e4",  "ci-lint",    "ci-build"),
      e("ci-e5",  "ci-test",    "ci-build"),
      e("ci-e6",  "ci-build",   "ci-scan"),
      e("ci-e7",  "ci-build",   "ci-stage"),
      e("ci-e8",  "ci-stage",   "ci-e2e"),
      e("ci-e9",  "ci-e2e",     "ci-approve"),
      e("ci-e10", "ci-approve", "ci-prod"),
    ],
  },
  {
    id: "event-driven",
    name: "Event-Driven System",
    description: "Producers emit events to a broker; consumers process them asynchronously.",
    nodes: [
      n("ev-web",      "Web App",              "rectangle", 1,    0,   0),
      n("ev-mobile",   "Mobile App",           "rectangle", 1,    0, 130),
      n("ev-api",      "API Service",          "pill",      0,  220,  65),
      n("ev-broker",   "Event Broker",         "hexagon",   7,  440,  45, 140, 140),
      n("ev-notif",    "Notification Handler", "rectangle", 2,  660,   0),
      n("ev-analytics","Analytics Handler",    "rectangle", 3,  660, 120),
      n("ev-audit",    "Audit Handler",        "rectangle", 4,  660, 240),
      n("ev-db-notif", "Notifications DB",     "cylinder",  2,  880,   0),
      n("ev-db-an",    "Analytics DB",         "cylinder",  3,  880, 120),
      n("ev-db-audit", "Audit Log",            "cylinder",  4,  880, 240),
    ],
    edges: [
      e("ev-e1", "ev-web",       "ev-api"),
      e("ev-e2", "ev-mobile",    "ev-api"),
      e("ev-e3", "ev-api",       "ev-broker"),
      e("ev-e4", "ev-broker",    "ev-notif"),
      e("ev-e5", "ev-broker",    "ev-analytics"),
      e("ev-e6", "ev-broker",    "ev-audit"),
      e("ev-e7", "ev-notif",     "ev-db-notif"),
      e("ev-e8", "ev-analytics", "ev-db-an"),
      e("ev-e9", "ev-audit",     "ev-db-audit"),
    ],
  },
]
