document.addEventListener("DOMContentLoaded", async function() {
  if (typeof d3 === "undefined") {
    console.error("D3.js is not loaded");
    return;
  }

  const graphData = await fetchGraphData("assets/linksData.json");
  setupGraph(graphData);
});

const nodeR = 5;
const nodeRH = 8;
async function fetchGraphData(url) {
  return fetch(url)
    .then(response => response.json())
    .then(json => toGraphData(json));
}

function toGraphData(linksData) {
  const nodes = Object.keys(linksData).map(book => ({ id: book }));
  const links = [];

  Object.entries(linksData).forEach(([book, data]) => {
    data.outboundLinks.forEach(outboundLink => {
      if (linksData[outboundLink]) {
        links.push({ source: book, target: outboundLink });
      }
    });
  });

  return { nodes, links };
}

let gd, nodeGroup, linkGroup, g, svgNode;

function setupGraph(graphData) {
  gd = graphData;
  const svg = d3.select("#d3-graph")
    .attr("width", "100%")
    .attr("height", "100%");
  g = svg.append("g");
  svgNode = svg.node();

  setupZoom(g, svg);
  const simulation = setupSimulation(graphData, svgNode);
  linkGroup = createLinks(g, graphData);
  nodeGroup = createNodes(g, graphData, simulation, svgNode, linkGroup);

  simulation.on("tick", () => updateGraph(nodeGroup, linkGroup, svgNode));

  window.addEventListener("resize", () => {
    updateSimulationCenter(simulation, svgNode);
  });

  const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      if (entry.target === svg.node()) {
        updateSimulationCenter(simulation, svg.node());
      }
    }
  });

  resizeObserver.observe(svg.node());

  const books = graphData.nodes.map(node => node.id);
  const options = {
    includeScore: true,
  };
  fuse = new Fuse(books, options);
}
let fuse;

function searchBooks(query) {
  const results = fuse.search(query);
  if (results && results.length > 0) {
    const bookTitle = results[0].item;
    const nodeToHighlight = gd.nodes.find(node => node.id === bookTitle);
    if (nodeToHighlight) {
      highlightNode(nodeToHighlight, gd.links, nodeGroup, linkGroup, g, svgNode);
    }

    loadBookContent(bookTitle);
  } else {
    console.log("search failed");
  }
}

function setupZoom(g, svg) {
  const zoom = d3.zoom().scaleExtent([0.5, 5]).on("zoom", event => g.attr("transform", event.transform));
  svg.call(zoom);
}

function updateSimulationCenter(simulation, svgNode) {
  const width = svgNode.getBoundingClientRect().width;
  const height = svgNode.getBoundingClientRect().height;

  simulation.force("center", d3.forceCenter(width / 2, height / 2))
    .alpha(1)
    .restart();
}

function setupMarkers(svg) {
  svg.append("defs").append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "-0 -5 10 10")
    .attr("refX", 21)
    .attr("refY", 0)
    .attr("orient", "auto")
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("xoverflow", "visible")
    .append("svg:path")
    .attr("d", "M 0,-5 L 10,0 L 0,5")
    .attr("fill", "#fff");
}

function setupSimulation(graphData, svgNode) {
  const width = svgNode.getBoundingClientRect().width;
  const height = svgNode.getBoundingClientRect().height;

  return d3.forceSimulation(graphData.nodes)
    .force("link", d3.forceLink(graphData.links).id(d => d.id))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "collide",
      d3.forceCollide(d => {
        return 30;
        // return Math.max(getTextWidth(d.id, "15px sans-serif") / 2, 20);
      }),
    );
}

function getTextWidth(text, font) {
  const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  context.font = font;
  return context.measureText(text).width;
}

function createNodes(g, graphData, simulation, svgNode, linkGroup) {
  const nodeGroup = g.append("g")
    .selectAll("g")
    .data(graphData.nodes)
    .join("g");

  nodeGroup.append("circle")
    .attr("r", nodeR)
    .attr("fill", "var(--surface-4)")
    .on("mouseover", showTooltip)
    .on("mouseout", hideTooltip)
    .on("click", (e, d) => {
      highlightNode(d, graphData.links, nodeGroup, linkGroup, g, svgNode);
      loadBookContent(d.id);
    });

  nodeGroup.call(drag(simulation));

  return nodeGroup;
}

function showTooltip(event, d) {
  // Show tooltip with d.id
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "graph-tooltip")
    .style("position", "absolute")
    .style("background", "white")
    .style("padding", "5px")
    .style("border", "1px solid #333")
    .html(d.id)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY + 10) + "px");
}

function hideTooltip() {
  d3.select(".graph-tooltip").remove();
}

function highlightNode(selectedNode, links, nodeGroup, linkGroup, g, svgNode) {
  const isConnectedNode = (a, b) =>
    links.some(l => (l.source.id === a && l.target.id === b) || (l.source.id === b && l.target.id === a));

  const isConnectedLink = link => {
    return link.source.id === selectedNode.id || link.target.id === selectedNode.id;
  };

  nodeGroup.each(function(d) {
    const node = d3.select(this);
    node.selectAll("text").remove();

    if (d.id === selectedNode.id || isConnectedNode(d.id, selectedNode.id)) {
      node.append("text")
        .text(d.id)
        .attr("x", 12)
        .attr("y", 3)
        .attr("text-anchor", "start")
        .attr("fill", "black")
        .style("z-index", "10")
        .style("font-size", "12px")
        .style("user-select", "none")
        .style("pointer-events", "none");
    }
  });

  nodeGroup.selectAll("circle")
    .attr("r", d => d.id === selectedNode.id ? nodeRH : nodeR)
    .attr(
      "fill",
      d => isConnectedNode(d.id, selectedNode.id) || d.id === selectedNode.id ? "var(--surface-4)" : "var(--surface-2)",
    );

  nodeGroup.selectAll("text")
    .style("z-index", d => d.id === selectedNode.id ? 10 : 20)
    .style("font-size", d => d.id === selectedNode.id ? "23px" : "15px")
    .style("font-weight", d => isConnectedNode(d.id, selectedNode.id) || d.id === selectedNode.id ? "bold" : "normal")
    .attr(
      "fill",
      d => isConnectedNode(d.id, selectedNode.id) || d.id === selectedNode.id ? "var(--text-1)" : "var(--text-3)",
    );

  linkGroup
    .style("opacity", l => isConnectedLink(l) ? 1 : 0.2);

  const width = svgNode.getBoundingClientRect().width;
  const height = svgNode.getBoundingClientRect().height;
  const x = width / 2 - selectedNode.x;
  const y = height / 2 - selectedNode.y;

  g.transition()
    .duration(500)
    .attr("transform", `translate(${x}, ${y})`);

  updateGraph(nodeGroup, linkGroup, svgNode);
}

async function loadBookContent(bookName) {
  const sidebarContent = document.getElementById("sidebar-content");
  try {
    const response = await fetch(`/books/${encodeURIComponent(bookName)}`);
    const content = await response.text();
    sidebarContent.innerHTML = content; // Display the fetched content in the sidebar
  } catch (error) {
    console.error("Error fetching book content:", error);
    sidebarContent.innerHTML = "Content could not be loaded."; // Error message
  }
}

function drag(simulation) {
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

function createLinks(g, graphData) {
  return g.append("g")
    .selectAll("line")
    .data(graphData.links)
    .join("line")
    .attr("stroke-width", 1)
    .attr("stroke", "var(--text-3)");
}

function updateGraph(nodeGroup, link, svgNode) {
  const padding = 20;
  const width = svgNode.getBoundingClientRect().width - padding * 2;
  const height = svgNode.getBoundingClientRect().height - padding * 2;

  link
    .attr("x1", d => d.source.x = Math.max(padding, Math.min(width + padding, d.source.x)))
    .attr("y1", d => d.source.y = Math.max(padding, Math.min(height + padding, d.source.y)))
    .attr("x2", d => d.target.x = Math.max(padding, Math.min(width + padding, d.target.x)))
    .attr("y2", d => d.target.y = Math.max(padding, Math.min(height + padding, d.target.y)));

  nodeGroup.selectAll("circle")
    .attr("cx", d => d.x = Math.max(padding, Math.min(width + padding, d.x)))
    .attr("cy", d => d.y = Math.max(padding, Math.min(height + padding, d.y)));

  nodeGroup.selectAll("text")
    .attr("x", d => d.x + 12)
    .attr("y", d => d.y + 3);
}

function showTooltip(event, d) {
  d3.select(".graph-tooltip").remove();

  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "graph-tooltip")
    .style("position", "absolute")
    .style("border", "1px solid #333")
    .style("background", "white")
    .style("color", "black")
    .style("padding", "10px")
    .style("z-index", "20")
    .style("display", "block");

  tooltip.html(`<h4>${d.id}</h4>`)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY + 10) + "px");

  function handleClickOutside(e) {
    if (!tooltip.node().contains(e.target)) {
      tooltip.remove();
      document.removeEventListener("click", handleClickOutside);
    }
  }

  setTimeout(() => {
    document.addEventListener("click", handleClickOutside);
  }, 10);
}

const sidebar = document.getElementsByTagName("side-bar")[0];
const resizeHandle = document.getElementById("resize-handle");
let isResizing = false;
let lastDownX;

resizeHandle.addEventListener("mousedown", function(e) {
  isResizing = true;
  lastDownX = e.clientX;
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", stopResize);
});

function handleMouseMove(e) {
  if (isResizing) {
    const width = e.clientX - lastDownX;
    sidebar.style.width = `${sidebar.offsetWidth - width}px`;
    lastDownX = e.clientX;
  }
}

function stopResize() {
  isResizing = false;
  document.removeEventListener("mousemove", handleMouseMove);
}
