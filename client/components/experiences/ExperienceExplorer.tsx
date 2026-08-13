"use client";

import { useMemo, useState } from "react";

import { ExperienceCard } from "./ExperienceCard";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChip } from "@/components/ui/FilterChip";
import { experienceCategories } from "@/data/experiences";
import type { Experience, ExperienceCategory } from "@/types";
import { pluralize } from "@/lib/utils";

interface ExperienceExplorerProps {
  experiences: Experience[];
}

export function ExperienceExplorer({ experiences }: ExperienceExplorerProps) {
  const [category, setCategory] = useState<ExperienceCategory | null>(null);

  const results = useMemo(
    () => (category ? experiences.filter((item) => item.category === category) : experiences),
    [experiences, category],
  );

  // Only offer categories that actually have something in them.
  const available = experienceCategories.filter((option) =>
    experiences.some((experience) => experience.category === option.value),
  );

  return (
    <section className="py-16 lg:py-20">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-5 border-b border-line pb-6">
          <div className="flex flex-wrap gap-2">
            <FilterChip selected={category === null} onClick={() => setCategory(null)}>
              Everything
            </FilterChip>
            {available.map((option) => (
              <FilterChip
                key={option.value}
                selected={category === option.value}
                onClick={() => setCategory(category === option.value ? null : option.value)}
              >
                {option.label}
              </FilterChip>
            ))}
          </div>

          <p className="type-body-sm text-muted">{pluralize(results.length, "experience")}</p>
        </div>

        {results.length > 0 ? (
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
            {results.map((experience, index) => (
              <ExperienceCard
                key={experience.id}
                experience={experience}
                priority={index < 3}
                className={index % 3 === 1 ? "lg:mt-14" : undefined}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing in that category yet"
            description="We add experiences as we find ones worth recommending. Tell us what you are after in the meantime."
            onReset={() => setCategory(null)}
            resetLabel="Show everything"
            action={{ label: "Ask us", href: "/contact" }}
          />
        )}
      </Container>
    </section>
  );
}
