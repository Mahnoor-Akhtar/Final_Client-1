import { createFileRoute } from "@tanstack/react-router";
import TeachersManager from "@/components/TeachersManager";

export const Route = createFileRoute("/app/teachers")({ component: TeachersManager });
