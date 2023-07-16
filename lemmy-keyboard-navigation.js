// ==UserScript==
// @name          lemmy-keyboard-navigation
// @version       1.8
// @license       GPL3
// @icon          https://raw.githubusercontent.com/InfinibyteF4/Lemmy-keyboard-navigation/main/icon.png
// @description   Navigate lemmy with your keyboard.
// ==/UserScript==

//isLemmySite
(function () {
  "use strict";
  if (!isLemmySite()) {
    return;
  }
  function isLemmySite() {
    return (
      document.querySelector('meta[name="Description"]').content === "Lemmy"
    );
  }

// Set selected entry colors
const backgroundColor = '#004742';
const textColor = 'white';

// Set navigation keys with keycodes here: https://www.toptal.com/developers/keycode
const nextKey = 'KeyJ';
const prevKey = 'KeyK';
const expandKey = 'KeyX';
const openCommentsKey = 'KeyC';
const openLinkandcollapseKey = 'Enter';
const nextPageKey = 'KeyL';
const prevPageKey = 'KeyH';
const upvoteKey = 'KeyA';
const downvoteKey = 'KeyZ';
const replycommKey = 'KeyR';
const saveKey = 'KeyS';

// Remove scroll animations
document.documentElement.style = "scroll-behavior: auto";

// Set CSS for selected entry
const css = [
".selected {",
"  background-color: " + backgroundColor + " !important;",
"  color: " + textColor + ";",
"}"
].join("\n");

// Global variables
let currentEntry;
let commentBlock;
let addStyle
let PRO_addStyle
let entries = [];
let previousUrl = "";
let expand = false;

if (typeof GM_addStyle !== "undefined") {
    GM_addStyle(css);
} else if (typeof PRO_addStyle !== "undefined") {
    PRO_addStyle(css);
} else if (typeof addStyle !== "undefined") {
    addStyle(css);
} else {
    let node = document.createElement("style");
    node.type = "text/css";
    node.appendChild(document.createTextNode(css));
    let heads = document.getElementsByTagName("head");
    if (heads.length > 0) {
        heads[0].appendChild(node);
    } else {
        // no head yet, stick it whereever
        document.documentElement.appendChild(node);
    }
}
const selectedClass = "selected";



const targetNode = document.documentElement;
const config = { childList: true, subtree: true };

const observer = new MutationObserver(() => {
    entries = document.querySelectorAll(".post-listing, .comment-node");

    if (entries.length > 0) {
        if (location.href !== previousUrl) {
            previousUrl = location.href;
            currentEntry = null;
        }
        init();
    }
});

observer.observe(targetNode, config);

function init() {
    // If jumping to comments
    if (window.location.search.includes("scrollToComments=true") &&
        entries.length > 1 &&
        (!currentEntry || Array.from(entries).indexOf(currentEntry) < 0)
    ) {
        selectEntry(entries[1], true);
    }
    // If jumping to comment from anchor link
    else if (window.location.pathname.includes("/comment/") &&
            (!currentEntry || Array.from(entries).indexOf(currentEntry) < 0)
    ) {
        const commentId = window.location.pathname.replace("/comment/", "");
        const anchoredEntry = document.getElementById("comment-" + commentId);

        if (anchoredEntry) {
            selectEntry(anchoredEntry, true);
        }
    }
    // If no entries yet selected, default to first
    else if (!currentEntry || Array.from(entries).indexOf(currentEntry) < 0) {
        selectEntry(entries[0]);
    }

    Array.from(entries).forEach(entry => {
        entry.removeEventListener("click", clickEntry, true);
        entry.addEventListener('click', clickEntry, true);
    });

    document.removeEventListener("keydown", handleKeyPress, true);
    document.addEventListener("keydown", handleKeyPress, true);
}

function handleKeyPress(event) {
    if (["TEXTAREA", "INPUT"].indexOf(event.target.tagName) > -1) {
        return;
    }

    switch (event.code) {
        case nextKey:
        case prevKey:{
            previousKey();
            }break;
        case upvoteKey:
            upVote();
            break;
        case downvoteKey:
            downVote();
            break;
        case expandKey:
            toggleExpand();
            expand = isExpanded() ? true : false;
            break;
        case saveKey:
            save();
            break;
        case openCommentsKey:
            comments();
            break;
        case replycommKey:
            if (window.location.pathname.includes("/post/")) {
                // Allow Mac refresh with CMD+R
                if (event.key !== 'Meta') {
                reply(event);
                }
            } else {
                community();
            }
            break;
        case openLinkandcollapseKey:
            if (window.location.pathname.includes("/post/")) {
                const moreReplies = currentEntry.querySelector("button.btn.btn-link.text-muted");
                if (moreReplies) {
                    moreReplies.click();
                    previousKey(5);
                } else {
                    currentEntry.querySelector("button.btn.btn-sm.btn-link.text-muted.me-2").click();
                }
            } else {
                const linkElement = currentEntry.querySelector(".col.flex-grow-1>p>a")
                    if (linkElement) {
                        if (event.shiftKey) {
                            window.open(linkElement.href);
                        } else {
                            linkElement.click();
                        }
                    } else {
                        comments();
                    }
                }
            break;
        case nextPageKey:
        case prevPageKey:{
            const pageButtons = Array.from(document.querySelectorAll(".paginator>button"));

            if (pageButtons && (document.getElementsByClassName('paginator').length > 0)) {
                const buttonText = event.code === nextPageKey ? "Next" : "Prev";
                pageButtons.find(btn => btn.innerHTML === buttonText).click();
            }
            // Jump next block of comments
            if (event.code === nextPageKey) {
                    commentBlock = getNextEntrySameLevel(currentEntry)
            }
            // Jump previous block of comments
            if (event.code === prevPageKey) {
                    commentBlock = getPrevEntrySameLevel(currentEntry)
            }

            if (commentBlock) {
                if (expand) collapseEntry();
                selectEntry(commentBlock, true);
                if (expand) expandEntry();
            }}
    }
}

function getNextEntry(e) {
    const currentEntryIndex = Array.from(entries).indexOf(e);

    if (currentEntryIndex + 1 >= entries.length) {
        return e;
    }

    return entries[currentEntryIndex + 1];
}

function getPrevEntry(e) {
    const currentEntryIndex = Array.from(entries).indexOf(e);

    if (currentEntryIndex - 1 < 0) {
        return e;
    }

    return entries[currentEntryIndex - 1];
}

function getNextEntrySameLevel(e) {
    const nextSibling = e.parentElement.nextElementSibling;

    if (!nextSibling || nextSibling.getElementsByTagName("article").length < 1) {
        return getNextEntry(e);
    }

    return nextSibling.getElementsByTagName("article")[0];
}

function getPrevEntrySameLevel(e) {
    const prevSibling = e.parentElement.previousElementSibling;

    if (!prevSibling || prevSibling.getElementsByTagName("article").length < 1) {
        return getPrevEntry(e);
    }

    return prevSibling.getElementsByTagName("article")[0];
}

function clickEntry(event) {
    const e = event.currentTarget;
    const target = event.target;

    // Deselect if already selected, also ignore if clicking on any link/button
    if (e === currentEntry && e.classList.contains(selectedClass) &&
        !(
            target.tagName.toLowerCase() === "button" || target.tagName.toLowerCase() === "a" ||
            target.parentElement.tagName.toLowerCase() === "button" ||
            target.parentElement.tagName.toLowerCase() === "a" ||
            target.parentElement.parentElement.tagName.toLowerCase() === "button" ||
            target.parentElement.parentElement.tagName.toLowerCase() === "a"
        )
    ) {
        e.classList.remove(selectedClass);
    } else {
        selectEntry(e);
    }
}

function selectEntry(e, scrollIntoView=false) {
    if (currentEntry) {
        currentEntry.classList.remove(selectedClass);
    }
    currentEntry = e;
    currentEntry.classList.add(selectedClass);

    if (scrollIntoView) {
        scrollIntoViewWithOffset(e, 15)
    }
}

function isExpanded() {
    if (
        currentEntry.querySelector("a.d-inline-block:not(.thumbnail)") ||
        currentEntry.querySelector("#postContent") ||
        currentEntry.querySelector(".card-body")
    ) {
        return true;
    }

    return false;
}

function previousKey(n) {
    let selectedEntry;
        // Next button
        if (event.code === nextKey) {
            selectedEntry = getNextEntry(currentEntry)
        }
        // Previous button
        if (event.code === prevKey) {
            selectedEntry = getPrevEntry(currentEntry)
        }
        // keep the selection near "more replies"
        if (n == 5) {
            selectedEntry = getPrevEntry(currentEntry)
        }
        if (selectedEntry) {
            if (expand) collapseEntry();
                selectEntry(selectedEntry, true);
            if (expand) expandEntry();
            }
}

function upVote() {
    const upvoteButton = currentEntry.querySelector("button[aria-label='Upvote']");

    if (upvoteButton) {
        upvoteButton.click();
    }
}

function downVote() {
    const downvoteButton = currentEntry.querySelector("button[aria-label='Downvote']");

    if (downvoteButton) {
        downvoteButton.click();
    }
}

function reply(event) {
    const replyButton = currentEntry.querySelector("button[data-tippy-content='reply']");

    if (replyButton) {
        event.preventDefault();
        replyButton.click();
    }
}

function community() {
    if (event.shiftKey) {
        window.open(
            currentEntry.querySelector("a.community-link").href,
                );
        } else {
            currentEntry.querySelector("a.community-link").click();
        }
}

function comments() {
    if (event.shiftKey) {
        window.open(
            currentEntry.querySelector("a.btn[title$='Comments']").href,
        );
    } else {
        currentEntry.querySelector("a.btn[title$='Comments']").click();
    }
}

function save() {
    const saveButton = currentEntry.querySelector("button[aria-label='save']");
    const unsaveButton = currentEntry.querySelector("button[aria-label='unsave']");
    const moreButton = currentEntry.querySelector("button[aria-label='more']");
    if (saveButton) {
        saveButton.click();
    } else if (unsaveButton) {
        unsaveButton.click();
    } else {
        moreButton.click();
        if (saveButton) {
            saveButton.click();
        } else if (unsaveButton) {
            unsaveButton.click();
        }
    }
}

function toggleExpand() {
    const expandButton = currentEntry.querySelector("button[aria-label='Expand here']");
    const textExpandButton = currentEntry.querySelector(".post-title>button");

    if (expandButton) {
        expandButton.click();

        // Scroll into view if picture/text preview cut off
        const imgContainer = currentEntry.querySelector("a.d-inline-block");

        if (imgContainer) {
            // Check container positions once image is loaded
            imgContainer.querySelector("img").addEventListener("load", function() {
                scrollIntoViewWithOffset(
                    imgContainer,
                    currentEntry.offsetHeight - imgContainer.offsetHeight + 10
                );
            }, true);
        }
    }

    if (textExpandButton) {
        textExpandButton.click();

        const textContainers = [currentEntry.querySelector("#postContent"), currentEntry.querySelector(".card-body")];
        textContainers.forEach(container => {
            if (container) {
                scrollIntoViewWithOffset(
                    container,
                    currentEntry.offsetHeight - container.offsetHeight + 10
                );
            }
        });
    }
}

function expandEntry() {
    if (!isExpanded()) toggleExpand();
}

function collapseEntry() {
    if (isExpanded()) toggleExpand();
}

function scrollIntoViewWithOffset(e, offset) {
    if (e.getBoundingClientRect().top < 0 ||
        e.getBoundingClientRect().bottom > window.innerHeight
    ) {
        const y = e.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({
            top: y
        });
    }


}

})();
