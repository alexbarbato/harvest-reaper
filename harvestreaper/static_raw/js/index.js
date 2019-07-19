import stringSimilarity from "string-similarity";

// Helper func to set assignments
const setAssignments = projectInput => {
  const index = projectInput.dataset.index;
  const projectInputValue =
    projectInput.options[projectInput.selectedIndex].value;
  const assignmentInput = document.querySelector(
    `[data-index="${index}"][data-sel="assignment-input"]`
  );

  // Remove existing options
  Array.from(assignmentInput.options).forEach(opt => {
    if (opt.value == "ignore") return;
    opt.remove();
  });

  // Remove or add disabled based on selected option
  if (projectInputValue == "ignore") {
    assignmentInput.setAttribute("disabled", true);
    return;
  } else {
    assignmentInput.removeAttribute("disabled");
  }

  // Assign correct tasks
  const assignmentList = harvestProjects.find(
    proj => proj.project_id == projectInputValue
  ).assignments;
  assignmentList.forEach(item => {
    const option = document.createElement("option");
    option.text = item.name;
    option.value = item.task_id;
    assignmentInput.add(option);
  });
};

window.addEventListener("DOMContentLoaded", () => {
  /**
   * Try to assign a value to projects on page load
   */
  const dataRows = document.querySelectorAll('[data-sel="row"]');
  // The first project input is fine since they are all the same
  const projectInput = document.querySelector('[data-sel="project-input"]');
  const projectOptions = Array.from(projectInput.options)
    .filter(opt => {
      if (opt.text == "Do not include") {
        return false;
      }
      return true;
    })
    .map(opt => {
      return opt.text;
    });

  dataRows &&
    Array.from(dataRows).forEach(row => {
      const summary = row.querySelector('[data-sel="summary"]').textContent;
      const currentProjectInput = row.querySelector(
        '[data-sel="project-input"]'
      );
      const currentProjectOptions = currentProjectInput.options;
      let matched = false;

      // Before we try to assign a fuzzy match, see if we have an existing match
      if (previousSubmissions) {
        for (const [key, value] of Object.entries(previousSubmissions)) {
          const similarity = stringSimilarity.compareTwoStrings(
            key,
            summary.toLowerCase()
          );

          // Do a very high threshhold similarity match that we can refine later
          if (similarity >= 0.95) {
            // Set the project first and then the assignments
            Array.from(currentProjectOptions).map(opt => {
              if (opt.value == value[0].toString()) {
                opt.selected = "selected";
                setAssignments(currentProjectInput);
              }
            });

            // Now that assignments have been populated assign the correct one
            const currentAssignmentInput = row.querySelector(
              '[data-sel="assignment-input"]'
            );
            const currentAssignmentOptions = currentAssignmentInput.options;
            Array.from(currentAssignmentOptions).map(opt => {
              if (opt.value == value[1].toString()) {
                opt.selected = "selected";
              }
            });

            matched = true;
          }
        }

        // Try simple fuzzy match of project if nothing else
        if (!matched) {
          const bestMatch = stringSimilarity.findBestMatch(
            summary.toLowerCase(),
            projectOptions.map(opt => opt.toLowerCase())
          ).bestMatch;
          // Default to ISL internal if we aren't pretty darn confident
          let matchValue = "iStrategyLabs ISL: Internal".toLowerCase();
          if (bestMatch.rating > 0.2) {
            matchValue = bestMatch.target;
          }

          Array.from(currentProjectOptions).map(opt => {
            if (opt.text.toLowerCase() == matchValue) {
              opt.selected = "selected";
              setAssignments(currentProjectInput);
            }
          });
        }
      }
    });

  /**
   * Add the event listener should the project inputs change to adjust assignments
   */
  const allProjectInputs = document.querySelectorAll(
    '[data-sel="project-input"]'
  );
  Array.from(allProjectInputs).forEach(projectInput => {
    projectInput.addEventListener("change", () => setAssignments(projectInput));
  });
});
