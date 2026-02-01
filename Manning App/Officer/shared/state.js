import { sections, workstationsBySection } from "../shared/constants";

export const state = {
  sections: {},
  buffer: []
};

export function initState(tokenData) {
  state.sections = {};
  state.buffer = [];

  sections.forEach(section => {
    const sectionData = tokenData[section] || {};

    state.sections[section] = {
      unassigned: Array.isArray(sectionData.unassigned)
        ? sectionData.unassigned
        : [],
      workstations: {}
    };

    (workstationsBySection[section] || []).forEach(ws => {
      state.sections[section].workstations[ws] =
        Array.isArray(sectionData.workstations?.[ws])
          ? sectionData.workstations[ws]
          : [];
    });
  });
}

